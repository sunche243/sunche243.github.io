import { createClient } from '@supabase/supabase-js';
import {validateContent} from './domain.js';
export const db=createClient('https://nwobpivpkokwpbmyhoeq.supabase.co','sb_publishable_AhmFMYhs55gECrX3QZKheA_OePHlN1X',{auth:{storageKey:'savepoint.auth.v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
export async function loadProjects(userId){
 const {data:member,error:me}=await db.from('savepoint_members').select('user_id').eq('user_id',userId).maybeSingle();
 if(me)throw Error('작업실에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
 if(!member)throw Error('이 계정에는 작업실 접근 권한이 없어요. 초대된 계정으로 로그인해 주세요.');
 const {data,error}=await db.from('savepoint_projects').select('*').eq('owner_id',userId).order('updated_at',{ascending:false});
 if(error)throw Error('기록을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
 return data.map(row=>({...validateContent(row.content),id:row.id,version:row.version,updatedAt:row.updated_at}));
}
export async function persistProject(p,userId){
 validateContent(p); const {version,...content}=p;
 const query=version?db.from('savepoint_projects').update({content}).eq('id',p.id).eq('owner_id',userId).eq('version',version):db.from('savepoint_projects').insert({id:p.id,owner_id:userId,content});
 const {data,error}=await query.select('id,version,updated_at').single();
 if(error){if(error.code==='PGRST116')throw Error('다른 창에서 이 기록이 바뀌었어요. 새로고침 후 다시 시도해 주세요. 입력 내용은 이 창에 남아 있어요.');throw Error('저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');}
 return {...p,version:data.version,updatedAt:data.updated_at};
}
export async function removeProject(p,userId){const {data,error}=await db.from('savepoint_projects').delete().eq('id',p.id).eq('owner_id',userId).eq('version',p.version).select('id');if(error||data.length!==1)throw Error('삭제하지 못했어요. 새로고침 후 다시 시도해 주세요.');}
