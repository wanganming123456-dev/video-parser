/**
 * 桌面版 — 主应用逻辑
 * 侧边栏导航 + 页面路由
 */
(function(){
'use strict';
var currentPage='parse',tasks={items:[]},pollTimer=null;

function $(s){return document.querySelector(s);}

var el={
  brand:$('#brandText'), navItems:document.querySelectorAll('.sidebar-nav-item'),
  title:$('#pageTitle'), desc:$('#pageDesc'), content:$('#pageContent'),
  badge:$('#taskBadge')
};

// ========== Toast ==========
window.Toast={show:function(m,t){
  t=t||'info'; var e=document.createElement('div');
  e.className='toast '+t; e.textContent=m; document.body.appendChild(e);
  setTimeout(function(){e.remove();},2800);
}};

// ========== 路由 ==========
var pages={
  parse:{title:'解析中心',desc:'粘贴分享链接，获取无水印视频',
    render:function(){
      el.content.innerHTML='<div class="input-group"><h3>🔗 粘贴链接</h3><div class="input-row"><input type="text" id="urlInput" placeholder="抖音 / 快手分享链接..."><button class="btn-primary" id="btnParse">🚀 开始解析</button></div><div class="tags"><span class="tag">🎵 抖音</span><span class="tag">🎬 快手</span><span class="tag">📱 APP分享</span><span class="tag">💻 网页链接</span></div></div><div class="task-list" id="taskList"><h3>📥 任务队列</h3><div id="taskListContent"><div class="empty-state"><div class="icon">📭</div><p>还没有解析任务</p></div></div></div>';
      bindParse();
      renderTasks(tasks);
    }
  },
  history:{title:'历史记录',desc:'已解析和已下载的视频',
    render:function(){
      el.content.innerHTML='<div id="historyList"><div class="empty-state"><div class="icon">📋</div><p>加载中...</p></div></div>';
      loadHistory();
    }
  },
  settings:{title:'设置',desc:'下载目录和 API 偏好',
    render:async function(){
      try{
        var s=await API.getSettings();
        el.content.innerHTML='<div class="settings-group"><h4>📁 下载设置</h4><div class="settings-row"><label>下载目录</label><input id="settingDir" value="'+(s.download_dir||'')+'"></div><button class="btn-save" onclick="App.saveSettings()">保存设置</button></div><div class="settings-group"><h4>📡 API</h4><div class="settings-row"><label>提供商</label><input id="settingApi" value="'+(s.api_provider||'free_api')+'"></div><button class="btn-save" onclick="App.saveSettings()">保存设置</button></div>';
      }catch(e){el.content.innerHTML='<div class="empty-state"><p>加载失败</p></div>';}
    }
  }
};

// ========== 导航 ==========
function navigate(page){
  currentPage=page;
  el.navItems.forEach(function(it){it.classList.toggle('active',it.dataset.page===page);});
  var p=pages[page]; if(!p)return;
  el.title.textContent=p.title; el.desc.textContent=p.desc;
  p.render();
  if(page!=='parse') stopPolling();
}
el.navItems.forEach(function(it){it.addEventListener('click',function(){navigate(it.dataset.page);});});

// ========== 解析 ==========
function bindParse(){
  var input=document.getElementById('urlInput'),btn=document.getElementById('btnParse');
  if(!input||!btn)return;
  btn.onclick=function(){submitUrl(input);};
  input.onkeydown=function(e){if(e.key==='Enter') submitUrl(input);};
}
async function submitUrl(input){
  var url=input.value.trim(); if(!url){Toast.show('请先粘贴链接','error');return;}
  try{await API.parse(url);Toast.show('任务已创建','info');input.value='';await refreshTasks();startPolling();}
  catch(e){Toast.show('解析失败: '+e.message,'error');}
}
async function onDownload(tid){
  try{Toast.show('下载中...','info');var r=await API.download(tid);Toast.show('下载完成! '+r.local_path,'success');await refreshTasks();}
  catch(e){Toast.show('下载失败: '+e.message,'error');}
}
async function onDelete(tid){
  try{await API.deleteTask(tid);Toast.show('已删除','info');await refreshTasks();}
  catch(e){Toast.show('删除失败','error');}
}
async function refreshTasks(){
  try{tasks=await API.getTasks();renderTasks(tasks);updateBadge();}catch(_){}
}
function renderTasks(result){
  var ct=document.getElementById('taskListContent'); if(!ct)return;
  var items=result.items||[];
  if(!items.length){ct.innerHTML='<div class="empty-state"><div class="icon">📭</div><p>还没有解析任务</p></div>';return;}
  var h=''; for(var i=0;i<items.length;i++){h+=taskCard(items[i]);} ct.innerHTML=h;
  bindTaskEvents();
}
function taskCard(t){
  var sm={'pending':'<span class="task-status parsing">⏳ 等待中</span>','parsing':'<span class="task-status parsing">⏳ 解析中...</span>','done':'<span class="task-status done">✅ 完成</span>'};
  var st=sm[t.status]||'<span class="task-status failed">❌ '+(t.error_msg||'失败')+'</span>';
  var pl=t.platform==='douyin'?'🎵 抖音':t.platform==='kuaishou'?'🎬 快手':'❓ '+t.platform;
  var ttl=(t.title||t.url||''); if(ttl.length>40) ttl=ttl.substring(0,40)+'...';
  var cs=t.cover_url?'style="background-image:url('+escAttr(t.cover_url)+');background-size:cover"':'';
  var dl=t.status==='done'?'<button class="btn-sm btn-dl" data-action="download" data-id="'+t.id+'">📥 下载</button>':'';
  return '<div class="task-card"><div class="task-thumb" '+cs+'>'+(t.cover_url?'':'🎬')+'</div><div class="task-info"><h4>'+escHtml(ttl)+'</h4><div class="task-meta"><span>'+pl+'</span><span>'+(t.created_at||'')+'</span></div></div>'+st+'<div class="task-actions">'+dl+'<button class="btn-sm btn-del" data-action="delete" data-id="'+t.id+'">🗑</button></div></div>';
}
function bindTaskEvents(){
  document.querySelectorAll('[data-action="download"]').forEach(function(b){b.onclick=function(){onDownload(parseInt(this.dataset.id));};});
  document.querySelectorAll('[data-action="delete"]').forEach(function(b){b.onclick=function(){onDelete(parseInt(this.dataset.id));};});
}
function updateBadge(){
  var n=tasks.items.filter(function(t){return t.status==='pending'||t.status==='parsing';}).length;
  var b=el.badge; if(b){b.textContent=n; b.style.display=n>0?'':'none';}
}
function startPolling(){stopPolling();pollTimer=setInterval(refreshTasks,2000);}
function stopPolling(){if(pollTimer){clearInterval(pollTimer);pollTimer=null;}}

async function loadHistory(){
  try{var r=await API.getHistory(1);var items=r.items||[];var ct=document.getElementById('historyList');
    if(!ct)return;
    if(!items.length){ct.innerHTML='<div class="empty-state"><div class="icon">📋</div><p>暂无历史记录</p></div>';return;}
    var h='<h3>📋 历史记录</h3>'; for(var i=0;i<items.length;i++){var it=items[i];h+='<div class="task-card"><div class="task-info"><h4>'+(it.title||'未知视频')+'</h4><div class="task-meta"><span>'+(it.platform||'')+'</span><span>'+(it.parsed_at||'')+'</span>'+(it.local_path?'<span>💾 已下载</span>':'')+'</span></div></div><div class="task-actions"><button class="btn-sm btn-del" data-hid="'+it.id+'">🗑</button></div></div>';}
    ct.innerHTML=h;
    document.querySelectorAll('[data-hid]').forEach(function(b){b.onclick=async function(){var hid=parseInt(this.dataset.hid);try{await API.deleteHistory(hid);Toast.show('已删除','info');loadHistory();}catch(e){Toast.show('删除失败','error');}};});
  }catch(e){}
}

// ========== 保存设置 ==========
window.App={navigate:navigate,saveSettings:function(){
  var d=document.getElementById('settingDir'),a=document.getElementById('settingApi'),obj={};
  if(d)obj.download_dir=d.value; if(a)obj.api_provider=a.value;
  API.updateSettings(obj).then(function(){Toast.show('设置已保存','success');}).catch(function(e){Toast.show('保存失败','error');});
}};

function escHtml(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
function escAttr(s){return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ========== 启动 ==========
navigate('parse');
})();
