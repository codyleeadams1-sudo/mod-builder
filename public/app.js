const $ = id => document.getElementById(id);
let selectedCategory = "movement", projectId = null;
document.querySelectorAll(".category").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".category").forEach(x => x.classList.remove("selected"));
  btn.classList.add("selected"); selectedCategory = btn.dataset.category;
}));
$("prompt").addEventListener("input", () => $("charCount").textContent = `${$("prompt").value.length} / 2000`);
$("mcVersion").addEventListener("change", () => {
  const mc = $("mcVersion").value;
  $("javaVersion").value = (mc.startsWith("1.21") ? "21" : "17");
});
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3200)}
async function post(url, body){
 const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await r.json();if(!r.ok)throw new Error(data.error||"Request failed");return data;
}
$("generate").addEventListener("click", async () => {
 const prompt=$("prompt").value.trim();if(!prompt){toast("Describe your mod idea first.");$("prompt").focus();return;}
 const btn=$("generate");btn.disabled=true;btn.innerHTML="<span>◌</span> Creating your mod…";
 $("result").classList.add("hidden");
 try{
  const data=await post("/api/generate",{prompt,category:selectedCategory,modName:$("modName").value,minecraftVersion:$("mcVersion").value,javaVersion:$("javaVersion").value,loader:$("loader").value,makeTextures:$("textures").checked});
  projectId=data.id;const p=data.project;
  $("projectDescription").textContent=p.description||"Your mod source project has been generated.";
  $("notes").innerHTML=(p.notes||[]).map(n=>`<div>• ${escapeHtml(n)}</div>`).join("");
  $("fileList").innerHTML=p.files.map(f=>`<div class="file-item"><span>▤</span>${escapeHtml(f.path)}</div>`).join("");
  $("buildState").textContent="SOURCE GENERATED";$("buildMessage").classList.add("hidden");$("download").classList.add("hidden");
  $("result").classList.remove("hidden");$("result").scrollIntoView({behavior:"smooth",block:"start"});toast("Your mod source is ready.");
 }catch(e){toast(e.message)}
 finally{btn.disabled=false;btn.innerHTML="<span>✦</span> Generate my mod <span class='arrow'>→</span>";}
});
$("compile").addEventListener("click",async()=>{
 if(!projectId)return;const b=$("compile");b.disabled=true;b.textContent="Compiling…";$("buildMessage").classList.remove("hidden");$("buildMessage").textContent="Running Gradle build. This can take a few minutes the first time…";
 try{const d=await post(`/api/build/${projectId}`,{});$("buildState").textContent="BUILD SUCCESS";$("buildMessage").textContent="Compilation successful. Your mod JAR is ready.";const a=$("download");a.href=d.jar;a.download=d.filename;a.classList.remove("hidden");b.textContent="Build again ↗";toast("Mod compiled successfully.");}
 catch(e){$("buildState").textContent="BUILD NEEDS ATTENTION";$("buildMessage").textContent=e.message;b.textContent="Retry compile ↗";}
 finally{b.disabled=false;}
});
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
// Companion extension hand-off: prefill the builder from a browser selection or popup.
(() => {
  const params = new URLSearchParams(window.location.search);
  const idea = params.get('idea');
  const category = params.get('category');
  if (idea) {
    $('prompt').value = idea.slice(0, 2000);
    $('charCount').textContent = `${$('prompt').value.length} / 2000`;
    if (category && document.querySelector(`.category[data-category="${CSS.escape(category)}"]`)) {
      document.querySelectorAll('.category').forEach(x => x.classList.remove('selected'));
      const target = document.querySelector(`.category[data-category="${CSS.escape(category)}"]`);
      target.classList.add('selected'); selectedCategory = category;
    }
    history.replaceState({}, '', window.location.pathname);
    toast('Browser idea imported. Ready to generate.');
    $('prompt').focus();
  }
})();
