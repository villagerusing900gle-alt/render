const MAX_MIN = 30;

const $ = sel => document.querySelector(sel);
const minutesRange = $('#minutes');
const minutesDisplay = $('.minutes-display') || document.createElement('div');
const startBtn = $('#startBtn');
const pauseBtn = $('#pauseBtn');
const resetBtn = $('#resetBtn');
const redirectBtn = $('#redirectBtn');
const sentenceBox = $('#sentenceBox');
const input = $('#input');
const timerEl = $('#timer');
const wpmEl = $('#wpm');
const capsWarning = $('#capsWarning');
const progressEl = $('#progress');
const finalStats = $('#finalStats');

let totalSeconds = 60;
let remaining = totalSeconds;
let timer = null;
let started = false;
let paused = false;
let startTime = 0;
let typedChars = 0;
let errors = 0;
let currentSentence = '';
let sentenceIndex = 0;
let difficulty = 0; // increases over time

function secToMMSS(s){
  const mm = String(Math.floor(s/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${mm}:${ss}`;
}

function updateMinutesDisplay(){
  const m = parseFloat(minutesRange.value);
  const s = Math.round(m*60);
  minutesDisplay.textContent = secToMMSS(s);
  totalSeconds = s;
  remaining = s;
  timerEl.textContent = secToMMSS(remaining);
}
minutesRange.addEventListener('input', updateMinutesDisplay);
updateMinutesDisplay();

function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function generateSentence(d){
  // difficulty d: 0..n. Increase length, punctuation, numbers, capitalization
  const baseWords = ["the","quick","brown","fox","jumps","over","lazy","dog","vibe","code","stack","shift","rhythm","pulse","neon","groove","sync","light","spark","echo","pixel","shift"];
  let len = 4 + Math.min(12, Math.floor(d/2)) + randInt(0,2);
  const parts = [];
  for(let i=0;i<len;i++){
    let w = baseWords[randInt(0,baseWords.length-1)];
    if(d>2 && Math.random()<0.12) w += (Math.random()<0.5?'-':'') + baseWords[randInt(0,baseWords.length-1)];
    if(d>4 && Math.random()<0.08) w = w.split('').reverse().join('');
    parts.push(w);
  }
  // add punctuation depending on difficulty
  let sentence = parts.join(' ');
  if(d>1 && Math.random()<0.6) sentence += (Math.random()<0.5?'.':',');
  if(d>3 && Math.random()<0.3) sentence += ' ' + randInt(10,999);
  // capitalization
  if(Math.random() < Math.min(0.9,0.3 + d*0.08)) sentence = sentence[0].toUpperCase() + sentence.slice(1);
  // add question or exclamation sometimes
  if(d>5 && Math.random()<0.2) sentence += Math.random()<0.5 ? '!' : '?';
  return sentence;
}

function nextSentence(){
  difficulty = Math.min(12, Math.floor((typedChars/40) + sentenceIndex/2));
  currentSentence = generateSentence(difficulty);
  sentenceIndex++;
  sentenceBox.textContent = currentSentence;
  input.value = '';
  input.focus();
}

function startTimer(){
  if(started && !paused) return;
  started = true;
  paused = false;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = false;
  startTime = Date.now();
  if(!timer){
    timer = setInterval(()=> {
      if(paused) return;
      if(remaining<=0){
        stopQuiz();
        return;
      }
      remaining--;
      timerEl.textContent = secToMMSS(remaining);
    },1000);
  }
}

function pauseTimer(){
  paused = true;
  pauseBtn.textContent = 'Resume';
  startBtn.disabled = false;
}

function resumeTimer(){
  paused = false;
  pauseBtn.textContent = 'Pause';
  startBtn.disabled = true;
}

pauseBtn.addEventListener('click', ()=>{
  if(paused) resumeTimer(); else pauseTimer();
});

startBtn.addEventListener('click', ()=>{
  // if not started or after reset
  if(!started) {
    remaining = totalSeconds;
    timerEl.textContent = secToMMSS(remaining);
    nextSentence();
  }
  startTimer();
});

resetBtn.addEventListener('click', ()=>{
  clearInterval(timer); timer=null;
  started=false; paused=false;
  remaining=totalSeconds;
  timerEl.textContent = secToMMSS(remaining);
  startBtn.disabled=false;
  pauseBtn.disabled=true;
  pauseBtn.textContent='Pause';
  typedChars=0; errors=0; sentenceIndex=0; difficulty=0;
  sentenceBox.textContent = '';
  input.value = '';
  wpmEl.textContent='WPM: 0';
  progressEl.textContent='Accuracy: 100% • Errors: 0';
  finalStats.textContent='';
});

function stopQuiz(){
  clearInterval(timer); timer=null;
  startBtn.disabled=false;
  pauseBtn.disabled=true;
  started=false;
  input.disabled=true;
  const elapsed = totalSeconds - remaining;
  const minutes = Math.max(1, elapsed/60);
  const wpm = Math.round((typedChars/5)/minutes);
  finalStats.textContent = `Finished — WPM: ${wpm}, Errors: ${errors}`;
}

input.addEventListener('input', (e)=>{
  const val = e.target.value;
  typedChars = typedChars + 0; // maintain
  // compare to current sentence
  const target = currentSentence;
  let correct = 0;
  for(let i=0;i<val.length && i<target.length;i++){
    if(val[i] === target[i]) correct++;
  }
  const localErrors = Math.max(0, val.length - correct);
  // update errors count as total mistakes typed (not perfect metric)
  errors = errors + localErrors - (errors>0?0:0); // keep simple: display counts of mismatches in current attempt
  // Update displayed progress (compute accuracy for current)
  const acc = val.length === 0 ? 100 : Math.round((correct / Math.max(1,val.length)) * 100);
  progressEl.textContent = `Accuracy: ${acc}% • Errors: ${localErrors}`;
  // if sentence completed exactly
  if(val === target || (val.length>target.length && val.startsWith(target))){
    typedChars += target.length;
    nextSentence();
  }
  // WPM estimate using typedChars and elapsed
  const elapsed = (totalSeconds - remaining);
  const mins = Math.max(1/60, elapsed/60);
  const wpm = Math.round((typedChars/5)/mins);
  wpmEl.textContent = `WPM: ${isFinite(wpm)?wpm:0}`;
});

input.addEventListener('keydown',(e)=>{
  const caps = e.getModifierState && e.getModifierState('CapsLock');
  handleCaps(caps);
});

input.addEventListener('keyup',(e)=>{
  const caps = e.getModifierState && e.getModifierState('CapsLock');
  handleCaps(caps);
});

function handleCaps(isOn){
  if(isOn){
    capsWarning.classList.remove('hidden');
    // pause timer until caps lock off
    if(started && !paused){
      paused = true;
      pauseBtn.textContent = 'Resume';
    }
  } else {
    capsWarning.classList.add('hidden');
    if(started && paused && pauseBtn.textContent === 'Resume'){
      // resume only if previously paused by caps (or user), we allow resume automatic
      paused = false;
      pauseBtn.textContent = 'Pause';
    }
  }
}

// Redirect button
redirectBtn.addEventListener('click', ()=> {
  // redirect in same tab
  window.location.href = 'https://guns.lol/vibed';
});

// Small accessibility: start typing to begin if a sentence exists or generate one
input.addEventListener('focus', ()=>{
  if(!started){
    if(!currentSentence) nextSentence();
  }
});

// Prevent caps auto-capitalization on mobile (already set attributes). Also detect virtual keyboard caps by key events not always possible; show warning if input value has uppercase while target is lowercase
input.addEventListener('input', ()=>{
  // crude check: if any uppercase letter typed while corresponding target lower -> show caps warning and pause
  const val = input.value;
  const target = currentSentence || '';
  for(let i=0;i<val.length;i++){
    if(i>=target.length) break;
    if(/[A-Z]/.test(val[i]) && val[i] === val[i].toUpperCase() && target[i] !== val[i]){
      handleCaps(true);
      return;
    }
  }
  // clear if no mismatch uppercase
  handleCaps(false);
});
