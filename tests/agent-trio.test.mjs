import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { AGENT_GROUPS, canonicalAgentId, mergeAgentChats } from '../agent-registry.ts';

// Execute the production request function with an isolated model transport.
// No API key, network connection or paid generation is needed.
const server = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const start = server.indexOf('      const runChatCall =');
const end = server.indexOf('      const reqAgentId =', start);
assert(start > 0 && end > start);
const source = ts.transpileModule(server.slice(start, end) + '\nglobalThis.run = runChatCall;', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
function fixture(generate, workflows = {}) {
  const context = vm.createContext({
    scope: 'ALL', AGENT_GROUPS, agentWorkflowContexts: workflows,
    getAgentDisplayName: id => AGENT_GROUPS.find(group => group.id === id).name,
    getAgentSystemPrompt: id => 'Role:' + id,
    getAgentBadge: id => AGENT_GROUPS.find(group => group.id === id).role,
    getAgentColor: id => AGENT_GROUPS.find(group => group.id === id).color,
    buildAgentMemoryPromptContext: id => 'private-memory:' + id,
    userMemoryPromptContext: 'shared-memory', linkedAppsPromptContext: '',
    dateTimeContext: '', dailyObjectivesContext: '', webInspectionContext: '',
    userMemory: null, hasMedia: false, hasUrlsInPrompt: false,
    chatModel: 'requested-model', fallbackList: ['fallback-model'],
    formattedContents: [{role:'user',parts:[{text:'Plan a launch'}]}], message:'Plan a launch',
    generateWithRetryAndFallback: generate,
    extractRawTextFromGenAiResult: response => response.text,
    sanitizeResponseText: text => text,
    parseThoughtAndAnswer: text => ({response:text}),
    cleanTextAndHandleImageTools: text => ({responseText:text}),
    console: {warn(){}},
  });
  vm.runInContext(source, context);
  return context.run;
}

test('all eight legacy IDs resolve to exactly three active roles', () => {
  assert.equal(AGENT_GROUPS.length, 3);
  assert.equal(AGENT_GROUPS.flatMap(group => group.members).length, 8);
  for (const group of AGENT_GROUPS) for (const id of [...group.members, group.name.toLowerCase()]) assert.equal(canonicalAgentId(id), group.id);
});

test('chat migration preserves original histories and is idempotent', () => {
  const original = Object.fromEntries(AGENT_GROUPS.flatMap(group => group.members).map(id => [id,[{id:'message-'+id,role:id}]]));
  const result = mergeAgentChats(original);
  assert.equal(result.syntax.length, 3); assert.equal(result.pulse.length, 2); assert.equal(result.chronos.length, 3);
  assert.equal(original.syntax.length, 1);
  assert.deepEqual(mergeAgentChats(result), result);
  assert.deepEqual(result.vega, original.vega);
});

test('existing ALL mode calls only the trio and returns a generated summary with actual model metadata', async () => {
  const calls=[];
  const run=fixture(async (_client, request) => { calls.push(request); return {text: calls.length === 4 ? 'Generated summary' : 'Real contribution', papayaModelUsed:'fallback-model'}; });
  const result=await run({});
  assert.deepEqual(Array.from(result.multiResponses, row=>row.agentId), ['syntax','pulse','chronos']);
  assert.equal(calls.length,4); assert.equal(result.response,'Generated summary'); assert.equal(result.modelUsed,'fallback-model');
  assert(result.multiResponses.every(row=>row.modelUsed === 'fallback-model'));
  assert.equal(result.agentSyncSynthesis,undefined);
});

test('disabled memory is omitted from that agent request', async () => {
  const calls=[];
  const run=fixture(async (_client, request)=>{calls.push(request);return {text:'answer',papayaModelUsed:'model'};}, {syntax:{useMemory:false}});
  await run({});
  assert(!calls[0].config.systemInstruction.includes('shared-memory'));
  assert(!calls[0].config.systemInstruction.includes('private-memory'));
});

test('total provider failure rejects instead of pretending work continues', async () => {
  await assert.rejects(fixture(async()=>{throw new Error('offline');})({}), /Keiner der drei Agenten/);
});

test('summary failure retains real contributions and reports the failed summary', async () => {
  let calls=0;
  const result=await fixture(async()=>{if(++calls===4)throw new Error('offline');return {text:'contribution',papayaModelUsed:'model'};})({});
  assert.equal(result.multiResponses.length,3);
  assert.match(result.response,/Zusammenfassung ist fehlgeschlagen/);
  assert.equal(result.modelUsed,undefined);
});

function workflowFixture(initial) {
  const values=new Map(Object.entries(initial));
  const exports={};
  const workflowSource=fs.readFileSync(new URL('../src/utils/agentAppLinksStore.ts',import.meta.url),'utf8');
  const output=ts.transpileModule(workflowSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const context=vm.createContext({exports,window:{},localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)},console,
    require:name=>name.includes('agent-registry')?{AGENT_GROUPS,canonicalAgentId}:{getSavedAgentWorkflowGraph:()=>null,getWorkflowPlan:()=>({orderedAppIds:[]})}});
  vm.runInContext(output,context);
  return {store:exports,values};
}

test('workflow migration combines previous tools while preserving strict memory and approval choices',()=>{
  const original=JSON.stringify({syntax:{enabledAppIds:['browser'],customInstructions:'Architecture',useMemory:true,requireActionApproval:false},neo:{enabledAppIds:['gmail'],customInstructions:'Screen',useMemory:false,requireActionApproval:true}});
  const {store,values}=workflowFixture({papaya_agent_workflows_v1:original});
  store.getAgentWorkflowSettings('syntax');
  const merged=JSON.parse(values.get('papaya_agent_workflows_v1')).syntax;
  assert.deepEqual(merged.enabledAppIds,['browser','gmail']);
  assert.equal(merged.useMemory,false);assert.equal(merged.requireActionApproval,true);
  assert.match(merged.customInstructions,/Architecture/);assert.match(merged.customInstructions,/Screen/);
  assert.equal(values.get('papaya_workflows_before_trio_v1'),original);
});

test('saved plugin links to legacy agents resolve to the consolidated roles',()=>{
  const {store}=workflowFixture({syntax_agent_app_links_v2:JSON.stringify({browser:'neo',mail:'pulse',security:'odin'})});
  const links=store.getAppToAgentLinkMap();
  assert.equal(links.browser,'syntax');assert.equal(links.mail,'pulse');assert.equal(links.security,'chronos');
});
