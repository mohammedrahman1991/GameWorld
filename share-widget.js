(function(){
  const CSS = `
#wb-share-overlay{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:99999;display:none;align-items:center;justify-content:center;padding:20px}
#wb-share-overlay.open{display:flex}
#wb-share-box{background:#161b27;border:1px solid rgba(255,255,255,.12);border-radius:20px;width:100%;max-width:360px;padding:28px 24px;text-align:center;font-family:'Segoe UI',system-ui,sans-serif;color:#f1f5f9}
#wb-share-game{font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin-bottom:8px}
#wb-share-result{font-size:1.35rem;font-weight:900;color:#f97316;margin-bottom:6px;line-height:1.3}
#wb-share-sub{font-size:.85rem;color:#64748b;margin-bottom:22px}
#wb-share-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.wb-soc{border:none;border-radius:10px;color:#fff;cursor:pointer;font-size:.82rem;font-weight:700;padding:11px 8px;transition:.15s}
.wb-soc:hover{filter:brightness(1.15);transform:translateY(-1px)}
.wb-twitter{background:#1d9bf0}
.wb-whatsapp{background:#25d366}
.wb-telegram{background:#29b6f6}
.wb-reddit{background:#ff4500}
#wb-share-copy{width:100%;border:1.5px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);border-radius:10px;color:#f1f5f9;cursor:pointer;font-size:.88rem;font-weight:700;padding:11px;margin-bottom:8px;transition:.18s;font-family:inherit}
#wb-share-copy:hover{border-color:#f97316;color:#f97316}
#wb-share-close{width:100%;border:none;background:none;color:#64748b;cursor:pointer;font-size:.82rem;padding:6px;font-family:inherit}
#wb-share-close:hover{color:#f1f5f9}
`;

  function inject(){
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const html = `
<div id="wb-share-overlay">
  <div id="wb-share-box">
    <div id="wb-share-game"></div>
    <div id="wb-share-result"></div>
    <div id="wb-share-sub">Can you beat me? Play free at wackybrains.com</div>
    <div id="wb-share-btns">
      <button class="wb-soc wb-twitter"  id="wb-tw">𝕏 Twitter</button>
      <button class="wb-soc wb-whatsapp" id="wb-wa">💬 WhatsApp</button>
      <button class="wb-soc wb-telegram" id="wb-tg">✈ Telegram</button>
      <button class="wb-soc wb-reddit"   id="wb-rd">👾 Reddit</button>
    </div>
    <button id="wb-share-copy">📋 Copy Link</button>
    <button id="wb-share-close">Close</button>
  </div>
</div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('wb-share-overlay').addEventListener('click', function(e){
      if(e.target === this) close();
    });
    document.getElementById('wb-share-close').addEventListener('click', close);
  }

  function close(){
    const el = document.getElementById('wb-share-overlay');
    if(el) el.classList.remove('open');
  }

  function enc(s){ return encodeURIComponent(s); }

  window.WackyShare = {
    show: function(gameName, resultText, gameUrl){
      if(!document.getElementById('wb-share-overlay')) inject();

      const url   = gameUrl || window.location.href;
      const text  = resultText + '\nPlay free at ' + url;

      document.getElementById('wb-share-game').textContent   = gameName;
      document.getElementById('wb-share-result').textContent = resultText;

      document.getElementById('wb-tw').onclick = ()=> window.open('https://twitter.com/intent/tweet?text='+enc(text),'_blank');
      document.getElementById('wb-wa').onclick = ()=> window.open('https://wa.me/?text='+enc(text),'_blank');
      document.getElementById('wb-tg').onclick = ()=> window.open('https://t.me/share/url?url='+enc(url)+'&text='+enc(resultText),'_blank');
      document.getElementById('wb-rd').onclick = ()=> window.open('https://reddit.com/submit?url='+enc(url)+'&title='+enc(resultText),'_blank');

      const copyBtn = document.getElementById('wb-share-copy');
      copyBtn.textContent = '📋 Copy Link';
      copyBtn.onclick = ()=>{
        navigator.clipboard.writeText(text).then(()=>{
          copyBtn.textContent = '✅ Copied!';
          setTimeout(()=>{ copyBtn.textContent = '📋 Copy Link'; }, 2000);
        });
      };

      document.getElementById('wb-share-overlay').classList.add('open');
    }
  };
})();
