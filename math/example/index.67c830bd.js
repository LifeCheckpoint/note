!function(){let e,t;setTimeout((()=>{t=document.querySelector("canvas"),t.startRecord=function(){const e=[],t=this.captureStream(60);this.mediaRecord=new MediaRecorder(t,{videoBitsPerSecond:85e5}),this.mediaRecord.ondataavailable=t=>{e.push(t.data)},this.mediaRecord.onstop=()=>{const t=new Blob(e,{type:"video/webm"});!function(e,t){var o=document.createElement("a");o.href=e,o.download=t,o.style.display="none",document.body.appendChild(o),o.click()}(window.URL.createObjectURL(t),"video.webm")},this.mediaRecord.start()},t.stopRecord=function(){console.log("stop"),this.mediaRecord.stop()},t.toggleRecord=function(){return this.isRecording?this.stopRecord():this.startRecord(),this.isRecording=!this.isRecording,this.isRecording}}),500);const o=document.createElement("button");o.innerText="录制",o.classList.add("record"),o.onclick=function(){this.innerText=t.toggleRecord()?"停止":"录制"},function(t){if(!e){const t=document.querySelector("head");e=document.createElement("style"),t.appendChild(e)}e.appendChild(document.createTextNode(t))}("\n.record {\n  position: fixed;\n  top: 10px;\n  left: 10px;\n}"),document.body.appendChild(o)}();
//# sourceMappingURL=index.67c830bd.js.map
