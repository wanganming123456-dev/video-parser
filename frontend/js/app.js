/**
 * 桌面版 — 主应用逻辑 v3
 * 标题栏/关闭按钮由 C# WinForms 原生提供，HTML 只管业务
 */
(function(){
'use strict';
var currentPage='parse',tasks={items:[]},pollTimer=null;
function $(s){return document.querySelector(s);}
function $$(s){return document.querySelectorAll(s);}

// ========== Toast ==========
window.Toast={show:function(m,t){
  t=t||'info'; var e=document.createElement('div');
  e.className='toast '+t; e.textContent=m; document.body.appendChild(e);
  setTimeout(function(){e.remove();},2800);
}};

// ========== 导航 ==========
var navItems=$$('.sidebar-nav-item');
var content=$('#pageContent');
var badge=$('#taskBadge');

var pages={
  parse:{
    render:function(){
      content.innerHTML='<div class="input-group"><h3>🔗 粘贴链接</h3><div class="input-row"><input type="text" id="urlInput" placeholder="抖音 / 快手分享链接..."><button class="btn-primary" id="btnParse">🚀 开始解析</button></div><div class="tags"><span class="tag">🎵 抖音</span><span class="tag">🎬 快手</span><span class="tag">📱 APP分享</span><span class="tag">💻 网页链接</span></div></div><div id="taskList"><h3>📥 任务队列</h3><div id="taskListContent"><div class="empty-state"><div class="icon">📭</div><p>还没有解析任务</p></div></div></div>';
      bindInput();
      renderTasks(tasks);
    }
  },
  history:{
    render:function(){
      content.innerHTML='<div id="historyList"><div class="empty-state"><div class="icon">📋</div><p>加载中...</p></div></div>';
      loadHistory();
    }
  },
  settings:{
    render:async function(){
      try{
        var s=await API.getSettings();
        content.innerHTML='<div class="settings-group"><h4>📁 下载设置</h4><div class="settings-row"><label>下载目录</label><input id="settingDir" value="'+(s.download_dir||'')+'"></div><button class="btn-save" id="btnSaveSettings1">保存设置</button></div><div class="settings-group"><h4>📡 API</h4><div class="settings-row"><label>提供商</label><input id="settingApi" value="'+(s.api_provider||'free_api')+'"></div><button class="btn-save" id="btnSaveSettings2">保存设置</button></div>';
        document.getElementById('btnSaveSettings1').onclick=saveSettings;
        document.getElementById('btnSaveSettings2').onclick=saveSettings;
      }catch(e){content.innerHTML='<div class="empty-state"><p>加载失败</p></div>';}
    }
  }
};

function navigate(page){
  currentPage=page;
  navItems.forEach(function(it){it.classList.toggle('active',it.dataset.page===page);});
  var p=pages[page]; if(!p)return;
  p.render();
  if(page!=='parse')stopPolling();
}

navItems.forEach(function(it){
  it.addEventListener('click',function(){navigate(it.dataset.page);});
});

// ========== 输入 & 解析 ==========
function bindInput(){
  var i=document.getElementById('urlInput'),b=document.getElementById('btnParse');
  if(!i||!b)return;
  function submit(){var u=i.value.trim();if(!u){Toast.show('请先粘贴链接','error');return;}API.parse(u).then(function(){Toast.show('任务已创建','info');i.value='';refreshTasks();startPolling();}).catch(function(e){Toast.show('解析失败: '+e.message,'error');});}
  b.onclick=submit;
  i.onkeydown=function(e){if(e.key==='Enter')submit();};
}

async function refreshTasks(){
  try{tasks=await API.getTasks();renderTasks(tasks);updateBadge();}catch(_){}
}
function renderTasks(result){
  var ct=document.getElementById('taskListContent'); if(!ct)return;
  var items=result.items||[];
  if(!items.length){ct.innerHTML='<div class="empty-state"><div class="icon">📭</div><p>还没有解析任务</p></div>';return;}
  var h=''; for(var i=0;i<items.length;i++){h+=card(items[i]);}ct.innerHTML=h;bindTask();
}
function card(t){
  var sm={'pending':'<span class="task-status parsing">⏳ 等待中</span>','parsing':'<span class="task-status parsing">⏳ 解析中...</span>','done':'<span class="task-status done">✅ 完成</span>'};
  var st=sm[t.status]||'<span class="task-status failed">❌ '+(t.error_msg||'失败')+'</span>';
  var pl=t.platform==='douyin'?'🎵 抖音':t.platform==='kuaishou'?'🎬 快手':'❓ '+t.platform;
  var ttl=(t.title||t.url||'');if(ttl.length>40)ttl=ttl.substring(0,40)+'...';
  var cs=t.cover_url?'style="background-image:url('+t.cover_url.replace(/"/g,'&quot;')+');background-size:cover"':'';
  var dl=t.status==='done'?'<button class="btn-sm btn-dl" data-act="dl" data-id="'+t.id+'">📥 下载</button>':'';
  return '<div class="task-card"><div class="task-thumb" '+cs+'>'+(t.cover_url?'':'🎬')+'</div><div class="task-info"><h4>'+esc(ttl)+'</h4><div class="task-meta"><span>'+pl+'</span><span>'+(t.created_at||'')+'</span></div></div>'+st+'<div class="task-actions">'+dl+'<button class="btn-sm btn-del" data-act="del" data-id="'+t.id+'">🗑</button></div></div>';
}
function bindTask(){
  $$('[data-act="dl"]').forEach(function(b){b.onclick=function(){dl(parseInt(this.dataset.id));};});
  $$('[data-act="del"]').forEach(function(b){b.onclick=function(){rm(parseInt(this.dataset.id));};});
}
async function dl(id){try{Toast.show('下载中...','info');var r=await API.download(id);Toast.show('✓ 下载完成','success');refreshTasks();}catch(e){Toast.show('下载失败: '+e.message,'error');}}
async function rm(id){try{await API.deleteTask(id);Toast.show('已删除','info');refreshTasks();}catch(e){Toast.show('删除失败','error');}}
function updateBadge(){
  var n=tasks.items.filter(function(t){return t.status==='pending'||t.status==='parsing';}).length;
  if(badge){badge.textContent=n;badge.style.display=n>0?'':'none';}
}
function startPolling(){stopPolling();pollTimer=setInterval(refreshTasks,2000);}
function stopPolling(){if(pollTimer){clearInterval(pollTimer);pollTimer=null;}}

async function loadHistory(){
  try{var r=await API.getHistory(1);var items=r.items||[];if(!items.length){document.getElementById('historyList').innerHTML='<div class="empty-state"><div class="icon">📋</div><p>暂无历史记录</p></div>';return;}
  var h='<h3>📋 历史记录</h3>';for(var i=0;i<items.length;i++){var it=items[i];h+='<div class="task-card"><div class="task-info"><h4>'+(it.title||'未知视频')+'</h4><div class="task-meta"><span>'+(it.platform||'')+'</span><span>'+(it.parsed_at||'')+'</span>'+(it.local_path?'<span>💾 已下载</span>':'')+'</span></div></div><div class="task-actions"><button class="btn-sm btn-del" data-hid="'+it.id+'">🗑</button></div></div>';}
  document.getElementById('historyList').innerHTML=h;
  $$('[data-hid]').forEach(function(b){b.onclick=async function(){try{await API.deleteHistory(parseInt(this.dataset.hid));Toast.show('已删除','info');loadHistory();}catch(e){Toast.show('删除失败','error');}};});
  }catch(e){document.getElementById('historyList').innerHTML='<div class="empty-state"><p>加载失败</p></div>';}
}

function saveSettings(){
  var d=document.getElementById('settingDir'),a=document.getElementById('settingApi'),obj={};
  if(d)obj.download_dir=d.value; if(a)obj.api_provider=a.value;
  API.updateSettings(obj).then(function(){Toast.show('设置已保存','success');}).catch(function(e){Toast.show('保存失败: '+e.message,'error');});
}
window.App={navigate:navigate,saveSettings:saveSettings};

function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
navigate('parse');
})();
