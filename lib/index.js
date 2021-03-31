(function(a,b){'object'==typeof exports&&'object'==typeof module?module.exports=b():'function'==typeof define&&define.amd?define('barejs-graphql-client',[],b):'object'==typeof exports?exports['barejs-graphql-client']=b():a['barejs-graphql-client']=b()})('undefined'==typeof self?this:self,function(){return function(a){function b(d){if(c[d])return c[d].exports;var e=c[d]={i:d,l:!1,exports:{}};return a[d].call(e.exports,e,e.exports,b),e.l=!0,e.exports}var c={};return b.m=a,b.c=c,b.d=function(a,c,d){b.o(a,c)||Object.defineProperty(a,c,{configurable:!1,enumerable:!0,get:d})},b.n=function(a){var c=a&&a.__esModule?function(){return a['default']}:function(){return a};return b.d(c,'a',c),c},b.o=function(a,b){return Object.prototype.hasOwnProperty.call(a,b)},b.p='',b(b.s=0)}([function(a,b,c){a.exports=c(1)},function(a,b,c){'use strict';function d(a,b,c,d,e,f,g,h){const i=new AbortController;return fetch(a,m({method:'POST',signal:i.signal,body:JSON.stringify({query:c,variables:d,operationName:e})},b)).then((a)=>{if(200===a.status)a.json().then((a)=>{f(a),h()}).catch((a)=>g(a));else if(201===a.status){const b=a.headers.get('location'),c=new EventSource(b);c.onmessage=(a)=>{const b=JSON.parse(a.data);f(b)},c.onerror=(a)=>{g(a)},i.signal.onabort=()=>{2!==c.readyState&&(c.close(),h())}}else g(new l(a,'Failed to execute GraphQL'))}).catch((a)=>g(a)),()=>{i.abort()}}function e(a,b,c,d,e,f,g){let h=a+'?query='+encodeURIComponent(b);c&&(h+='&variables='+encodeURIComponent(JSON.stringify(c))),d&&(h+='&operationName='+encodeURIComponent(d));const i=new EventSource(h);i.onmessage=(a)=>{const b=JSON.parse(a.data);e(b)},i.onerror=(a)=>{f(a)};const j=new AbortController;return j.signal.onabort=()=>{2!==i.readyState&&(i.close(),g())},j.abort}function f(a,b,c,d,e,f,g){fetch(a,n({method:'POST',body:JSON.stringify({query:c,variables:d,operationName:e})},b)).then((a)=>{a.ok?a.json().then((a)=>{g(a)}).catch((a)=>f(a)):f(new l(a,'Failed to execute GraphQL'))}).catch((a)=>f(a))}function g(a,b,c){return new WritableStream({write(b){a(b)},close(){c()},abort(a){'AbortError'===a.name?c():b(a)}})}function h(){return new TransformStream({start(a){a.buf='',a.pos=0},transform(a,b){for(b.buf+=a;b.pos<b.buf.length;)if('\n'===b.buf[b.pos]){const a=b.buf.substring(0,b.pos);''!==a&&b.enqueue(a),b.buf=b.buf.substring(b.pos+1),b.pos=0}else++b.pos},flush(a){0!==a.pos&&a.enqueue(a.buf)}})}function i(a,b,c,d,e,f,i,j){const k=JSON.stringify({query:c,variables:d,operationName:e}),l='POST',m=new AbortController;return fetch(a,o({method:l,headers:new Headers(o({allow:l,"content-type":'application/json',accept:'application/json'},(b||{}).headers)),mode:'cors',body:k,signal:m.signal},b)).then((a)=>{if(200===a.status){const b=h(),c=g(f,i,j);a.body.pipeThrough(new TextDecoderStream).pipeThrough(b).pipeThrough(new TransformStream({transform(a,b){b.enqueue(JSON.parse(a))}})).pipeTo(c).catch(()=>{})}else i(new Error('Unhandled response'))}).catch((a)=>{i(a)}),()=>m.abort()}function j(a,b,c,d,e,f,g){let h=null;const i=new s(a,{},(a,i)=>{a||i?a?f(a):h=i(b,c,d,(a,b)=>{a||i?e({data:b,errors:a}):g()}):g()},'graphql-ws'),j=i.shutdown.bind(i);return()=>{null!==h&&h(),j()}}function k(a,b,c,d,e,f,g,h){const i=new AbortController;return fetch(a,t({method:'POST',signal:i.signal,body:JSON.stringify({query:c,variables:d,operationName:e})},b)).then((a)=>{if(200===a.status)a.json().then((a)=>{f(a),h()}).catch((a)=>g(a));else if(201===a.status){const b=a.headers.get('location'),k=b.indexOf('?'),l='ws'+b.slice(4,-1===k?void 0:k),m=j(l,c,d,e,f,g,h);i.signal.onabort=()=>{m()}}else g(new l(a,'Failed to execute GraphQL'))}).catch((a)=>{g(a)}),()=>{i.abort()}}Object.defineProperty(b,'__esModule',{value:!0});class l extends Error{constructor(a,...b){super(...b),Error.captureStackTrace&&Error.captureStackTrace(this,l),this.name='FetchError',this.response=a}}var m=Object.assign||function(a){for(var b,c=1;c<arguments.length;c++)for(var d in b=arguments[c],b)Object.prototype.hasOwnProperty.call(b,d)&&(a[d]=b[d]);return a},n=Object.assign||function(a){for(var b,c=1;c<arguments.length;c++)for(var d in b=arguments[c],b)Object.prototype.hasOwnProperty.call(b,d)&&(a[d]=b[d]);return a},o=Object.assign||function(a){for(var b,c=1;c<arguments.length;c++)for(var d in b=arguments[c],b)Object.prototype.hasOwnProperty.call(b,d)&&(a[d]=b[d]);return a};class p extends Error{constructor(a,...b){super(...b),Error.captureStackTrace&&Error.captureStackTrace(this,p),this.details=a}}class q extends Error{constructor(a,...b){super(...b),Error.captureStackTrace&&Error.captureStackTrace(this,q),this.event=a}}const r={CONNECTION_INIT:'connection_init',CONNECTION_ACK:'connection_ack',CONNECTION_ERROR:'connection_error',CONNECTION_KEEP_ALIVE:'ka',START:'start',STOP:'stop',CONNECTION_TERMINATE:'connection_terminate',DATA:'data',ERROR:'error',COMPLETE:'complete'};class s{constructor(a,b,c,d='graphql-ws'){this.callback=c,this.nextId=1,this.subscriptions=new Map,this.webSocket=new WebSocket(a,d),this.webSocket.onopen=()=>{this.webSocket.send(JSON.stringify({type:r.CONNECTION_INIT,payload:b}))},this.webSocket.onclose=(a)=>{const b=1e3===a.code||1005===a.code?null:new q(a);this.callback(b);const c=Array.from(this.subscriptions.values());this.subscriptions.clear();for(const d of c)d(b,null)},this.webSocket.onmessage=this.onMessage.bind(this)}subscribe(a,b,c,d){const e=(this.nextId++).toString();return this.subscriptions.set(e,d),this.webSocket.send(JSON.stringify({type:r.START,id:e,payload:{query:a,variables:b,operationName:c}})),()=>{this.subscriptions.delete(e),this.webSocket.send(JSON.stringify({type:r.STOP,id:e}))}}shutdown(){this.webSocket.send(JSON.stringify({type:r.CONNECTION_TERMINATE})),this.webSocket.close()}onMessage(a){const b=JSON.parse(a.data);switch(b.type){case r.CONNECTION_ACK:{this.callback&&this.callback(null,this.subscribe.bind(this));break}case r.CONNECTION_ERROR:{this.callback&&this.callback(new p(b.payload),this);break}case r.CONNECTION_KEEP_ALIVE:break;case r.DATA:{const a=this.subscriptions.get(b.id);if(a){const c=b.payload.errors?new p(b.payload.errors):null;a(c,b.payload.data)}break}case r.ERROR:{const a=this.subscriptions.get(b.id);a&&a(new p(b.payload),null);break}case r.COMPLETE:{const a=this.subscriptions.get(b.id);a&&(this.subscriptions.delete(b.id),a(null,null));break}}}}var t=Object.assign||function(a){for(var b,c=1;c<arguments.length;c++)for(var d in b=arguments[c],b)Object.prototype.hasOwnProperty.call(b,d)&&(a[d]=b[d]);return a};c.d(b,'FetchError',function(){return l}),c.d(b,'graphqlEventSourceClient',function(){return d}),c.d(b,'graphqlEventSourceSubscriber',function(){return e}),c.d(b,'graphqlFetchClient',function(){return f}),c.d(b,'graphqlStreamClient',function(){return i}),c.d(b,'graphqlWsSubscriber',function(){return j}),c.d(b,'graphqlWsClient',function(){return k}),c.d(b,'graphqlClient',function(){return k})}])});
//# sourceMappingURL=index.js.map