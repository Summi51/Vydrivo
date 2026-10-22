import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {planStoryboard} from './planner.mjs';
import {validateStoryboard,storyboardHash} from './storyboard.mjs';
try{
  const [mode,input]=process.argv.slice(2);
  if(!['--validate','--generate'].includes(mode)||!input)throw new Error('Usage: plan --validate storyboard.json OR plan --generate topic.json');
  const value=JSON.parse(readFileSync(input,'utf8'));
  if(mode==='--validate'){validateStoryboard(value);console.log(`Valid storyboard. Review hash: ${storyboardHash(value)}`);}
  else{
    // Reserve a unique attempt before any external request; uncertain requests are never auto-retried.
    const out=path.resolve('prototype/output',`plan-${Date.now()}-${process.pid}`);mkdirSync(out,{recursive:true});
    const journal=path.join(out,'attempt.json');
    writeFileSync(journal,JSON.stringify({state:'started',automaticRetry:false,costCapINR:0}),{flag:'wx',mode:0o600});
    const board=await planStoryboard({...value,baseUrl:process.env.AI_BASE_URL,model:process.env.AI_MODEL,apiKey:process.env.AI_API_KEY,freeTierVerified:process.env.AI_FREE_TIER_VERIFIED==='true'});
    writeFileSync(path.join(out,'storyboard.json'),JSON.stringify(board,null,2),{flag:'wx',mode:0o600});
    writeFileSync(path.join(out,'review.json'),JSON.stringify({approved:false,storyboardHash:storyboardHash(board)},null,2),{flag:'wx',mode:0o600});
    writeFileSync(journal,JSON.stringify({state:'awaiting-human-review',model:process.env.AI_MODEL,costCapINR:0},null,2));
    console.log(`Draft saved for review: ${out}`);
  }
}catch(e){console.error(e.message);process.exitCode=1;}
