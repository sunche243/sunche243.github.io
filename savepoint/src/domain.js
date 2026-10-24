export const categories = {project:'프로젝트',study:'공부',life:'생활'};
export const colors = ['green','peach','blue','lavender'];
export function escapeHTML(value='') { return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function newProject(input={}) {
 const now=new Date().toISOString();
 return {id:crypto.randomUUID(),title:String(input.title||'새로운 프로젝트').slice(0,100),category:Object.hasOwn(categories,input.category)?input.category:'project',description:String(input.description||'').slice(0,1000),color:colors.includes(input.color)?input.color:'green',status:'active',nextAction:'',decisions:[],tasks:[],notes:[],links:[],createdAt:now,updatedAt:now};
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateContent(c) {
 if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.title!=='string'||!c.title.trim()||c.title.length>100) throw Error('프로젝트 이름을 100자 이내로 입력해 주세요.');
 if(!Object.hasOwn(categories,c.category)||!['active','done','paused'].includes(c.status)||!colors.includes(c.color)||typeof c.description!=='string'||typeof c.nextAction!=='string') throw Error('프로젝트 형식을 확인해 주세요.');
 for(const key of ['decisions','tasks','notes','links']) if(!Array.isArray(c[key])||c[key].length>1000) throw Error('기록 형식을 확인해 주세요.');
 if(!uuid.test(c.id)) throw Error('프로젝트 ID가 올바르지 않습니다.');
 for(const t of c.tasks) if(!uuid.test(t?.id)||typeof t.text!=='string'||typeof t.done!=='boolean') throw Error('할 일 형식이 올바르지 않습니다.');
 for(const d of c.decisions) if(!uuid.test(d?.id)||typeof d.text!=='string') throw Error('결정 사항 형식이 올바르지 않습니다.');
 for(const n of c.notes) if(!uuid.test(n?.id)||typeof n.title!=='string'||typeof n.text!=='string'||typeof n.createdAt!=='string') throw Error('메모 형식이 올바르지 않습니다.');
 for(const l of c.links) if(typeof l.title!=='string'||!safeURL(l.url)) throw Error('http 또는 https 자료 링크를 입력해 주세요.');
 if(JSON.stringify(c).length>1500000) throw Error('프로젝트가 너무 큽니다. 대화를 나누어 보관해 주세요.');
 return c;
}
export function safeURL(input) {try{const u=new URL(input);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch{return null;}}
export function progress(p) {return p.tasks.length?Math.round(p.tasks.filter(t=>t.done).length/p.tasks.length*100):0;}
export function matches(p,q) {return [p.title,p.description,p.nextAction,...p.tasks.map(t=>t.text),...p.decisions.map(d=>d.text),...p.notes.map(n=>n.title+' '+n.text)].join(' ').toLocaleLowerCase().includes(q.toLocaleLowerCase());}
export function resumePrompt(p) {
 return `이전 작업을 이어서 진행하려고 해. 아래 맥락을 먼저 읽어줘.\n\n프로젝트: ${p.title}\n목적: ${p.description}\n\n이미 결정한 것:\n${p.decisions.map(d=>'- '+d.text).join('\n')||'- 아직 없음'}\n\n남은 할 일:\n${p.tasks.filter(t=>!t.done).map(t=>'- '+t.text).join('\n')||'- 아직 없음'}\n\n다음 행동: ${p.nextAction||'다음 행동을 함께 정해줘.'}\n\n최근 기록:\n${p.notes.slice(-3).map(n=>n.title+'\n'+n.text).join('\n\n').slice(-16000)}\n\n이 맥락을 바탕으로 다음 행동부터 이어서 도와줘.`;
}
export function parseConversationFile(text) {
 let data;try{data=JSON.parse(text);}catch{return [{title:'가져온 대화',text}];}
 const source=Array.isArray(data)?data:Array.isArray(data.conversations)?data.conversations:null;
 if(!source) throw Error('ChatGPT conversations.json 또는 텍스트 파일을 선택해 주세요.');
 return source.slice(0,2000).map(c=>{
  let messages=[];
  if(c.mapping){let node=c.current_node, seen=new Set();while(node&&c.mapping[node]&&!seen.has(node)){seen.add(node);const n=c.mapping[node];if(n.message)messages.unshift(n.message);node=n.parent;}if(!messages.length)messages=Object.values(c.mapping).map(n=>n.message).filter(Boolean);}
  else messages=c.messages||[];
  return {title:String(c.title||'제목 없는 대화').slice(0,100),text:messages.filter(m=>['user','assistant'].includes(m.author?.role||m.role)).map(m=>`${(m.author?.role||m.role)==='user'?'나':'도우미'}: ${typeof m.content==='string'?m.content:(m.content?.parts||[]).filter(v=>typeof v==='string').join('\n')}`).filter(Boolean).join('\n\n')};
 }).filter(c=>c.text.trim());
}
export function extractSuggestions(text) {
 const lines=text.split(/\n+/).map(s=>s.replace(/^[\s>*#\-\d.)]+/,'').trim()).filter(s=>s.length>4&&s.length<240);
 return {decisions:[...new Set(lines.filter(s=>/확정|결정|하기로|사용하기|유지한다/.test(s)))].slice(0,6),tasks:[...new Set(lines.filter(s=>/해야|할 일|확인하|준비하|수정하|다음.*단계/.test(s)))].slice(0,6)};
}
export function localDay(d=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
export function demoProjects(){const p=newProject({title:'작은 아이디어 실험',description:'일상에서 발견한 불편을, 직접 써볼 수 있는 서비스로.',category:'project',color:'green'});p.tasks=[{id:crypto.randomUUID(),text:'누가 겪는 문제인지 적어보기',done:true},{id:crypto.randomUUID(),text:'가장 작은 첫 화면 그려보기',done:false}];p.decisions=[{id:crypto.randomUUID(),text:'첫 버전은 핵심 기능 하나에 집중하기'}];p.nextAction='가장 먼저 검증할 가설 한 가지 적기';const q=newProject({title:'이번 주 공부',description:'오늘 이해한 것과 내일 다시 볼 것을 한곳에.',category:'study',color:'blue'});q.nextAction='어려웠던 개념 세 가지 복습하기';return [p,q];}
