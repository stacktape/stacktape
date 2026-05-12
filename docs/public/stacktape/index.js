var J8=require("node:module");var F=(J,Y)=>()=>(Y||J((Y={exports:{}}).exports,Y),Y.exports);var B0=F((e)=>{var F0="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");e.encode=function(J){if(0<=J&&J<F0.length)return F0[J];throw TypeError("Must be between 0 and 63: "+J)};e.decode=function(J){var Y=65,X=90,z=97,K=122,Z=48,$=57,q=43,W=47,D=26,T=52;if(Y<=J&&J<=X)return J-Y;if(z<=J&&J<=K)return J-z+D;if(Z<=J&&J<=$)return J-Z+T;if(J==q)return 62;if(J==W)return 63;return-1}});var J0=F((Y0)=>{var O0=B0(),a=5,U0=1<<a,k0=U0-1,y0=U0;function X8(J){return J<0?(-J<<1)+1:(J<<1)+0}function z8(J){var Y=(J&1)===1,X=J>>1;return Y?-X:X}Y0.encode=function(Y){var X="",z,K=X8(Y);do{if(z=K&k0,K>>>=a,K>0)z|=y0;X+=O0.encode(z)}while(K>0);return X};Y0.decode=function(Y,X,z){var K=Y.length,Z=0,$=0,q,W;do{if(X>=K)throw Error("Expected more digits in base 64 VLQ value.");if(W=O0.decode(Y.charCodeAt(X++)),W===-1)throw Error("Invalid base64 digit: "+Y.charAt(X-1));q=!!(W&y0),W&=k0,Z=Z+(W<<$),$+=a}while(q);z.value=z8(Z),z.rest=X}});var S=F((b)=>{function K8(J,Y,X){if(Y in J)return J[Y];else if(arguments.length===3)return X;else throw Error('"'+Y+'" is a required argument.')}b.getArg=K8;var P0=/^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/,Z8=/^data:.+\,.+$/;function g(J){var Y=J.match(P0);if(!Y)return null;return{scheme:Y[1],auth:Y[2],host:Y[3],port:Y[4],path:Y[5]}}b.urlParse=g;function C(J){var Y="";if(J.scheme)Y+=J.scheme+":";if(Y+="//",J.auth)Y+=J.auth+"@";if(J.host)Y+=J.host;if(J.port)Y+=":"+J.port;if(J.path)Y+=J.path;return Y}b.urlGenerate=C;function X0(J){var Y=J,X=g(J);if(X){if(!X.path)return J;Y=X.path}var z=b.isAbsolute(Y),K=Y.split(/\/+/);for(var Z,$=0,q=K.length-1;q>=0;q--)if(Z=K[q],Z===".")K.splice(q,1);else if(Z==="..")$++;else if($>0)if(Z==="")K.splice(q+1,$),$=0;else K.splice(q,2),$--;if(Y=K.join("/"),Y==="")Y=z?"/":".";if(X)return X.path=Y,C(X);return Y}b.normalize=X0;function f0(J,Y){if(J==="")J=".";if(Y==="")Y=".";var X=g(Y),z=g(J);if(z)J=z.path||"/";if(X&&!X.scheme){if(z)X.scheme=z.scheme;return C(X)}if(X||Y.match(Z8))return Y;if(z&&!z.host&&!z.path)return z.host=Y,C(z);var K=Y.charAt(0)==="/"?Y:X0(J.replace(/\/+$/,"")+"/"+Y);if(z)return z.path=K,C(z);return K}b.join=f0;b.isAbsolute=function(J){return J.charAt(0)==="/"||P0.test(J)};function $8(J,Y){if(J==="")J=".";J=J.replace(/\/$/,"");var X=0;while(Y.indexOf(J+"/")!==0){var z=J.lastIndexOf("/");if(z<0)return Y;if(J=J.slice(0,z),J.match(/^([^\/]+:\/)?\/*$/))return Y;++X}return Array(X+1).join("../")+Y.substr(J.length+1)}b.relative=$8;var v0=function(){var J=Object.create(null);return!("__proto__"in J)}();function N0(J){return J}function W8(J){if(L0(J))return"$"+J;return J}b.toSetString=v0?N0:W8;function q8(J){if(L0(J))return J.slice(1);return J}b.fromSetString=v0?N0:q8;function L0(J){if(!J)return!1;var Y=J.length;if(Y<9)return!1;if(J.charCodeAt(Y-1)!==95||J.charCodeAt(Y-2)!==95||J.charCodeAt(Y-3)!==111||J.charCodeAt(Y-4)!==116||J.charCodeAt(Y-5)!==111||J.charCodeAt(Y-6)!==114||J.charCodeAt(Y-7)!==112||J.charCodeAt(Y-8)!==95||J.charCodeAt(Y-9)!==95)return!1;for(var X=Y-10;X>=0;X--)if(J.charCodeAt(X)!==36)return!1;return!0}function D8(J,Y,X){var z=M(J.source,Y.source);if(z!==0)return z;if(z=J.originalLine-Y.originalLine,z!==0)return z;if(z=J.originalColumn-Y.originalColumn,z!==0||X)return z;if(z=J.generatedColumn-Y.generatedColumn,z!==0)return z;if(z=J.generatedLine-Y.generatedLine,z!==0)return z;return M(J.name,Y.name)}b.compareByOriginalPositions=D8;function T8(J,Y,X){var z=J.generatedLine-Y.generatedLine;if(z!==0)return z;if(z=J.generatedColumn-Y.generatedColumn,z!==0||X)return z;if(z=M(J.source,Y.source),z!==0)return z;if(z=J.originalLine-Y.originalLine,z!==0)return z;if(z=J.originalColumn-Y.originalColumn,z!==0)return z;return M(J.name,Y.name)}b.compareByGeneratedPositionsDeflated=T8;function M(J,Y){if(J===Y)return 0;if(J===null)return 1;if(Y===null)return-1;if(J>Y)return 1;return-1}function Q8(J,Y){var X=J.generatedLine-Y.generatedLine;if(X!==0)return X;if(X=J.generatedColumn-Y.generatedColumn,X!==0)return X;if(X=M(J.source,Y.source),X!==0)return X;if(X=J.originalLine-Y.originalLine,X!==0)return X;if(X=J.originalColumn-Y.originalColumn,X!==0)return X;return M(J.name,Y.name)}b.compareByGeneratedPositionsInflated=Q8;function _8(J){return JSON.parse(J.replace(/^\)]}'[^\n]*\n/,""))}b.parseSourceMapInput=_8;function E8(J,Y,X){if(Y=Y||"",J){if(J[J.length-1]!=="/"&&Y[0]!=="/")J+="/";Y=J+Y}if(X){var z=g(X);if(!z)throw Error("sourceMapURL could not be parsed");if(z.path){var K=z.path.lastIndexOf("/");if(K>=0)z.path=z.path.substring(0,K+1)}Y=f0(C(z),Y)}return X0(Y)}b.computeSourceURL=E8});var Z0=F((R0)=>{var z0=S(),K0=Object.prototype.hasOwnProperty,N=typeof Map<"u";function P(){this._array=[],this._set=N?new Map:Object.create(null)}P.fromArray=function(Y,X){var z=new P;for(var K=0,Z=Y.length;K<Z;K++)z.add(Y[K],X);return z};P.prototype.size=function(){return N?this._set.size:Object.getOwnPropertyNames(this._set).length};P.prototype.add=function(Y,X){var z=N?Y:z0.toSetString(Y),K=N?this.has(Y):K0.call(this._set,z),Z=this._array.length;if(!K||X)this._array.push(Y);if(!K)if(N)this._set.set(Y,Z);else this._set[z]=Z};P.prototype.has=function(Y){if(N)return this._set.has(Y);else{var X=z0.toSetString(Y);return K0.call(this._set,X)}};P.prototype.indexOf=function(Y){if(N){var X=this._set.get(Y);if(X>=0)return X}else{var z=z0.toSetString(Y);if(K0.call(this._set,z))return this._set[z]}throw Error('"'+Y+'" is not in the set.')};P.prototype.at=function(Y){if(Y>=0&&Y<this._array.length)return this._array[Y];throw Error("No element indexed by "+Y)};P.prototype.toArray=function(){return this._array.slice()};R0.ArraySet=P});var C0=F((x0)=>{var A0=S();function V8(J,Y){var X=J.generatedLine,z=Y.generatedLine,K=J.generatedColumn,Z=Y.generatedColumn;return z>X||z==X&&Z>=K||A0.compareByGeneratedPositionsInflated(J,Y)<=0}function t(){this._array=[],this._sorted=!0,this._last={generatedLine:-1,generatedColumn:0}}t.prototype.unsortedForEach=function(Y,X){this._array.forEach(Y,X)};t.prototype.add=function(Y){if(V8(this._last,Y))this._last=Y,this._array.push(Y);else this._sorted=!1,this._array.push(Y)};t.prototype.toArray=function(){if(!this._sorted)this._array.sort(A0.compareByGeneratedPositionsInflated),this._sorted=!0;return this._array};x0.MappingList=t});var $0=F((M0)=>{var l=J0(),w=S(),p=Z0().ArraySet,j8=C0().MappingList;function U(J){if(!J)J={};this._file=w.getArg(J,"file",null),this._sourceRoot=w.getArg(J,"sourceRoot",null),this._skipValidation=w.getArg(J,"skipValidation",!1),this._sources=new p,this._names=new p,this._mappings=new j8,this._sourcesContents=null}U.prototype._version=3;U.fromSourceMap=function(Y){var X=Y.sourceRoot,z=new U({file:Y.file,sourceRoot:X});return Y.eachMapping(function(K){var Z={generated:{line:K.generatedLine,column:K.generatedColumn}};if(K.source!=null){if(Z.source=K.source,X!=null)Z.source=w.relative(X,Z.source);if(Z.original={line:K.originalLine,column:K.originalColumn},K.name!=null)Z.name=K.name}z.addMapping(Z)}),Y.sources.forEach(function(K){var Z=K;if(X!==null)Z=w.relative(X,K);if(!z._sources.has(Z))z._sources.add(Z);var $=Y.sourceContentFor(K);if($!=null)z.setSourceContent(K,$)}),z};U.prototype.addMapping=function(Y){var X=w.getArg(Y,"generated"),z=w.getArg(Y,"original",null),K=w.getArg(Y,"source",null),Z=w.getArg(Y,"name",null);if(!this._skipValidation)this._validateMapping(X,z,K,Z);if(K!=null){if(K=String(K),!this._sources.has(K))this._sources.add(K)}if(Z!=null){if(Z=String(Z),!this._names.has(Z))this._names.add(Z)}this._mappings.add({generatedLine:X.line,generatedColumn:X.column,originalLine:z!=null&&z.line,originalColumn:z!=null&&z.column,source:K,name:Z})};U.prototype.setSourceContent=function(Y,X){var z=Y;if(this._sourceRoot!=null)z=w.relative(this._sourceRoot,z);if(X!=null){if(!this._sourcesContents)this._sourcesContents=Object.create(null);this._sourcesContents[w.toSetString(z)]=X}else if(this._sourcesContents){if(delete this._sourcesContents[w.toSetString(z)],Object.keys(this._sourcesContents).length===0)this._sourcesContents=null}};U.prototype.applySourceMap=function(Y,X,z){var K=X;if(X==null){if(Y.file==null)throw Error(`SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, or the source map's "file" property. Both were omitted.`);K=Y.file}var Z=this._sourceRoot;if(Z!=null)K=w.relative(Z,K);var $=new p,q=new p;this._mappings.unsortedForEach(function(W){if(W.source===K&&W.originalLine!=null){var D=Y.originalPositionFor({line:W.originalLine,column:W.originalColumn});if(D.source!=null){if(W.source=D.source,z!=null)W.source=w.join(z,W.source);if(Z!=null)W.source=w.relative(Z,W.source);if(W.originalLine=D.line,W.originalColumn=D.column,D.name!=null)W.name=D.name}}var T=W.source;if(T!=null&&!$.has(T))$.add(T);var E=W.name;if(E!=null&&!q.has(E))q.add(E)},this),this._sources=$,this._names=q,Y.sources.forEach(function(W){var D=Y.sourceContentFor(W);if(D!=null){if(z!=null)W=w.join(z,W);if(Z!=null)W=w.relative(Z,W);this.setSourceContent(W,D)}},this)};U.prototype._validateMapping=function(Y,X,z,K){if(X&&typeof X.line!=="number"&&typeof X.column!=="number")throw Error("original.line and original.column are not numbers -- you probably meant to omit the original mapping entirely and only map the generated position. If so, pass null for the original mapping instead of an object with empty or null values.");if(Y&&"line"in Y&&"column"in Y&&Y.line>0&&Y.column>=0&&!X&&!z&&!K)return;else if(Y&&"line"in Y&&"column"in Y&&X&&"line"in X&&"column"in X&&Y.line>0&&Y.column>=0&&X.line>0&&X.column>=0&&z)return;else throw Error("Invalid mapping: "+JSON.stringify({generated:Y,source:z,original:X,name:K}))};U.prototype._serializeMappings=function(){var Y=0,X=1,z=0,K=0,Z=0,$=0,q="",W,D,T,E,_=this._mappings.toArray();for(var V=0,O=_.length;V<O;V++){if(D=_[V],W="",D.generatedLine!==X){Y=0;while(D.generatedLine!==X)W+=";",X++}else if(V>0){if(!w.compareByGeneratedPositionsInflated(D,_[V-1]))continue;W+=","}if(W+=l.encode(D.generatedColumn-Y),Y=D.generatedColumn,D.source!=null){if(E=this._sources.indexOf(D.source),W+=l.encode(E-$),$=E,W+=l.encode(D.originalLine-1-K),K=D.originalLine-1,W+=l.encode(D.originalColumn-z),z=D.originalColumn,D.name!=null)T=this._names.indexOf(D.name),W+=l.encode(T-Z),Z=T}q+=W}return q};U.prototype._generateSourcesContent=function(Y,X){return Y.map(function(z){if(!this._sourcesContents)return null;if(X!=null)z=w.relative(X,z);var K=w.toSetString(z);return Object.prototype.hasOwnProperty.call(this._sourcesContents,K)?this._sourcesContents[K]:null},this)};U.prototype.toJSON=function(){var Y={version:this._version,sources:this._sources.toArray(),names:this._names.toArray(),mappings:this._serializeMappings()};if(this._file!=null)Y.file=this._file;if(this._sourceRoot!=null)Y.sourceRoot=this._sourceRoot;if(this._sourcesContents)Y.sourcesContent=this._generateSourcesContent(Y.sources,Y.sourceRoot);return Y};U.prototype.toString=function(){return JSON.stringify(this.toJSON())};M0.SourceMapGenerator=U});var S0=F((L)=>{L.GREATEST_LOWER_BOUND=1;L.LEAST_UPPER_BOUND=2;function W0(J,Y,X,z,K,Z){var $=Math.floor((Y-J)/2)+J,q=K(X,z[$],!0);if(q===0)return $;else if(q>0){if(Y-$>1)return W0($,Y,X,z,K,Z);if(Z==L.LEAST_UPPER_BOUND)return Y<z.length?Y:-1;else return $}else{if($-J>1)return W0(J,$,X,z,K,Z);if(Z==L.LEAST_UPPER_BOUND)return $;else return J<0?-1:J}}L.search=function(Y,X,z,K){if(X.length===0)return-1;var Z=W0(-1,X.length,Y,X,z,K||L.GREATEST_LOWER_BOUND);if(Z<0)return-1;while(Z-1>=0){if(z(X[Z],X[Z-1],!0)!==0)break;--Z}return Z}});var d0=F((h0)=>{function q0(J,Y,X){var z=J[Y];J[Y]=J[X],J[X]=z}function w8(J,Y){return Math.round(J+Math.random()*(Y-J))}function D0(J,Y,X,z){if(X<z){var K=w8(X,z),Z=X-1;q0(J,K,z);var $=J[z];for(var q=X;q<z;q++)if(Y(J[q],$)<=0)Z+=1,q0(J,Z,q);q0(J,Z+1,q);var W=Z+1;D0(J,Y,X,W-1),D0(J,Y,W+1,z)}}h0.quickSort=function(J,Y){D0(J,Y,0,J.length-1)}});var l0=F((o)=>{var Q=S(),T0=S0(),h=Z0().ArraySet,H8=J0(),m=d0().quickSort;function j(J,Y){var X=J;if(typeof J==="string")X=Q.parseSourceMapInput(J);return X.sections!=null?new k(X,Y):new H(X,Y)}j.fromSourceMap=function(J,Y){return H.fromSourceMap(J,Y)};j.prototype._version=3;j.prototype.__generatedMappings=null;Object.defineProperty(j.prototype,"_generatedMappings",{configurable:!0,enumerable:!0,get:function(){if(!this.__generatedMappings)this._parseMappings(this._mappings,this.sourceRoot);return this.__generatedMappings}});j.prototype.__originalMappings=null;Object.defineProperty(j.prototype,"_originalMappings",{configurable:!0,enumerable:!0,get:function(){if(!this.__originalMappings)this._parseMappings(this._mappings,this.sourceRoot);return this.__originalMappings}});j.prototype._charIsMappingSeparator=function(Y,X){var z=Y.charAt(X);return z===";"||z===","};j.prototype._parseMappings=function(Y,X){throw Error("Subclasses must implement _parseMappings")};j.GENERATED_ORDER=1;j.ORIGINAL_ORDER=2;j.GREATEST_LOWER_BOUND=1;j.LEAST_UPPER_BOUND=2;j.prototype.eachMapping=function(Y,X,z){var K=X||null,Z=z||j.GENERATED_ORDER,$;switch(Z){case j.GENERATED_ORDER:$=this._generatedMappings;break;case j.ORIGINAL_ORDER:$=this._originalMappings;break;default:throw Error("Unknown order of iteration.")}var q=this.sourceRoot;$.map(function(W){var D=W.source===null?null:this._sources.at(W.source);return D=Q.computeSourceURL(q,D,this._sourceMapURL),{source:D,generatedLine:W.generatedLine,generatedColumn:W.generatedColumn,originalLine:W.originalLine,originalColumn:W.originalColumn,name:W.name===null?null:this._names.at(W.name)}},this).forEach(Y,K)};j.prototype.allGeneratedPositionsFor=function(Y){var X=Q.getArg(Y,"line"),z={source:Q.getArg(Y,"source"),originalLine:X,originalColumn:Q.getArg(Y,"column",0)};if(z.source=this._findSourceIndex(z.source),z.source<0)return[];var K=[],Z=this._findMapping(z,this._originalMappings,"originalLine","originalColumn",Q.compareByOriginalPositions,T0.LEAST_UPPER_BOUND);if(Z>=0){var $=this._originalMappings[Z];if(Y.column===void 0){var q=$.originalLine;while($&&$.originalLine===q)K.push({line:Q.getArg($,"generatedLine",null),column:Q.getArg($,"generatedColumn",null),lastColumn:Q.getArg($,"lastGeneratedColumn",null)}),$=this._originalMappings[++Z]}else{var W=$.originalColumn;while($&&$.originalLine===X&&$.originalColumn==W)K.push({line:Q.getArg($,"generatedLine",null),column:Q.getArg($,"generatedColumn",null),lastColumn:Q.getArg($,"lastGeneratedColumn",null)}),$=this._originalMappings[++Z]}}return K};o.SourceMapConsumer=j;function H(J,Y){var X=J;if(typeof J==="string")X=Q.parseSourceMapInput(J);var z=Q.getArg(X,"version"),K=Q.getArg(X,"sources"),Z=Q.getArg(X,"names",[]),$=Q.getArg(X,"sourceRoot",null),q=Q.getArg(X,"sourcesContent",null),W=Q.getArg(X,"mappings"),D=Q.getArg(X,"file",null);if(z!=this._version)throw Error("Unsupported version: "+z);if($)$=Q.normalize($);K=K.map(String).map(Q.normalize).map(function(T){return $&&Q.isAbsolute($)&&Q.isAbsolute(T)?Q.relative($,T):T}),this._names=h.fromArray(Z.map(String),!0),this._sources=h.fromArray(K,!0),this._absoluteSources=this._sources.toArray().map(function(T){return Q.computeSourceURL($,T,Y)}),this.sourceRoot=$,this.sourcesContent=q,this._mappings=W,this._sourceMapURL=Y,this.file=D}H.prototype=Object.create(j.prototype);H.prototype.consumer=j;H.prototype._findSourceIndex=function(J){var Y=J;if(this.sourceRoot!=null)Y=Q.relative(this.sourceRoot,Y);if(this._sources.has(Y))return this._sources.indexOf(Y);var X;for(X=0;X<this._absoluteSources.length;++X)if(this._absoluteSources[X]==J)return X;return-1};H.fromSourceMap=function(Y,X){var z=Object.create(H.prototype),K=z._names=h.fromArray(Y._names.toArray(),!0),Z=z._sources=h.fromArray(Y._sources.toArray(),!0);z.sourceRoot=Y._sourceRoot,z.sourcesContent=Y._generateSourcesContent(z._sources.toArray(),z.sourceRoot),z.file=Y._file,z._sourceMapURL=X,z._absoluteSources=z._sources.toArray().map(function(V){return Q.computeSourceURL(z.sourceRoot,V,X)});var $=Y._mappings.toArray().slice(),q=z.__generatedMappings=[],W=z.__originalMappings=[];for(var D=0,T=$.length;D<T;D++){var E=$[D],_=new g0;if(_.generatedLine=E.generatedLine,_.generatedColumn=E.generatedColumn,E.source){if(_.source=Z.indexOf(E.source),_.originalLine=E.originalLine,_.originalColumn=E.originalColumn,E.name)_.name=K.indexOf(E.name);W.push(_)}q.push(_)}return m(z.__originalMappings,Q.compareByOriginalPositions),z};H.prototype._version=3;Object.defineProperty(H.prototype,"sources",{get:function(){return this._absoluteSources.slice()}});function g0(){this.generatedLine=0,this.generatedColumn=0,this.source=null,this.originalLine=null,this.originalColumn=null,this.name=null}H.prototype._parseMappings=function(Y,X){var z=1,K=0,Z=0,$=0,q=0,W=0,D=Y.length,T=0,E={},_={},V=[],O=[],I,s,G,x,I0;while(T<D)if(Y.charAt(T)===";")z++,T++,K=0;else if(Y.charAt(T)===",")T++;else{I=new g0,I.generatedLine=z;for(x=T;x<D;x++)if(this._charIsMappingSeparator(Y,x))break;if(s=Y.slice(T,x),G=E[s],G)T+=s.length;else{G=[];while(T<x)H8.decode(Y,T,_),I0=_.value,T=_.rest,G.push(I0);if(G.length===2)throw Error("Found a source, but no line and column");if(G.length===3)throw Error("Found a source and line, but no column");E[s]=G}if(I.generatedColumn=K+G[0],K=I.generatedColumn,G.length>1){if(I.source=q+G[1],q+=G[1],I.originalLine=Z+G[2],Z=I.originalLine,I.originalLine+=1,I.originalColumn=$+G[3],$=I.originalColumn,G.length>4)I.name=W+G[4],W+=G[4]}if(O.push(I),typeof I.originalLine==="number")V.push(I)}m(O,Q.compareByGeneratedPositionsDeflated),this.__generatedMappings=O,m(V,Q.compareByOriginalPositions),this.__originalMappings=V};H.prototype._findMapping=function(Y,X,z,K,Z,$){if(Y[z]<=0)throw TypeError("Line must be greater than or equal to 1, got "+Y[z]);if(Y[K]<0)throw TypeError("Column must be greater than or equal to 0, got "+Y[K]);return T0.search(Y,X,Z,$)};H.prototype.computeColumnSpans=function(){for(var Y=0;Y<this._generatedMappings.length;++Y){var X=this._generatedMappings[Y];if(Y+1<this._generatedMappings.length){var z=this._generatedMappings[Y+1];if(X.generatedLine===z.generatedLine){X.lastGeneratedColumn=z.generatedColumn-1;continue}}X.lastGeneratedColumn=1/0}};H.prototype.originalPositionFor=function(Y){var X={generatedLine:Q.getArg(Y,"line"),generatedColumn:Q.getArg(Y,"column")},z=this._findMapping(X,this._generatedMappings,"generatedLine","generatedColumn",Q.compareByGeneratedPositionsDeflated,Q.getArg(Y,"bias",j.GREATEST_LOWER_BOUND));if(z>=0){var K=this._generatedMappings[z];if(K.generatedLine===X.generatedLine){var Z=Q.getArg(K,"source",null);if(Z!==null)Z=this._sources.at(Z),Z=Q.computeSourceURL(this.sourceRoot,Z,this._sourceMapURL);var $=Q.getArg(K,"name",null);if($!==null)$=this._names.at($);return{source:Z,line:Q.getArg(K,"originalLine",null),column:Q.getArg(K,"originalColumn",null),name:$}}}return{source:null,line:null,column:null,name:null}};H.prototype.hasContentsOfAllSources=function(){if(!this.sourcesContent)return!1;return this.sourcesContent.length>=this._sources.size()&&!this.sourcesContent.some(function(Y){return Y==null})};H.prototype.sourceContentFor=function(Y,X){if(!this.sourcesContent)return null;var z=this._findSourceIndex(Y);if(z>=0)return this.sourcesContent[z];var K=Y;if(this.sourceRoot!=null)K=Q.relative(this.sourceRoot,K);var Z;if(this.sourceRoot!=null&&(Z=Q.urlParse(this.sourceRoot))){var $=K.replace(/^file:\/\//,"");if(Z.scheme=="file"&&this._sources.has($))return this.sourcesContent[this._sources.indexOf($)];if((!Z.path||Z.path=="/")&&this._sources.has("/"+K))return this.sourcesContent[this._sources.indexOf("/"+K)]}if(X)return null;else throw Error('"'+K+'" is not in the SourceMap.')};H.prototype.generatedPositionFor=function(Y){var X=Q.getArg(Y,"source");if(X=this._findSourceIndex(X),X<0)return{line:null,column:null,lastColumn:null};var z={source:X,originalLine:Q.getArg(Y,"line"),originalColumn:Q.getArg(Y,"column")},K=this._findMapping(z,this._originalMappings,"originalLine","originalColumn",Q.compareByOriginalPositions,Q.getArg(Y,"bias",j.GREATEST_LOWER_BOUND));if(K>=0){var Z=this._originalMappings[K];if(Z.source===z.source)return{line:Q.getArg(Z,"generatedLine",null),column:Q.getArg(Z,"generatedColumn",null),lastColumn:Q.getArg(Z,"lastGeneratedColumn",null)}}return{line:null,column:null,lastColumn:null}};o.BasicSourceMapConsumer=H;function k(J,Y){var X=J;if(typeof J==="string")X=Q.parseSourceMapInput(J);var z=Q.getArg(X,"version"),K=Q.getArg(X,"sections");if(z!=this._version)throw Error("Unsupported version: "+z);this._sources=new h,this._names=new h;var Z={line:-1,column:0};this._sections=K.map(function($){if($.url)throw Error("Support for url field in sections not implemented.");var q=Q.getArg($,"offset"),W=Q.getArg(q,"line"),D=Q.getArg(q,"column");if(W<Z.line||W===Z.line&&D<Z.column)throw Error("Section offsets must be ordered and non-overlapping.");return Z=q,{generatedOffset:{generatedLine:W+1,generatedColumn:D+1},consumer:new j(Q.getArg($,"map"),Y)}})}k.prototype=Object.create(j.prototype);k.prototype.constructor=j;k.prototype._version=3;Object.defineProperty(k.prototype,"sources",{get:function(){var J=[];for(var Y=0;Y<this._sections.length;Y++)for(var X=0;X<this._sections[Y].consumer.sources.length;X++)J.push(this._sections[Y].consumer.sources[X]);return J}});k.prototype.originalPositionFor=function(Y){var X={generatedLine:Q.getArg(Y,"line"),generatedColumn:Q.getArg(Y,"column")},z=T0.search(X,this._sections,function(Z,$){var q=Z.generatedLine-$.generatedOffset.generatedLine;if(q)return q;return Z.generatedColumn-$.generatedOffset.generatedColumn}),K=this._sections[z];if(!K)return{source:null,line:null,column:null,name:null};return K.consumer.originalPositionFor({line:X.generatedLine-(K.generatedOffset.generatedLine-1),column:X.generatedColumn-(K.generatedOffset.generatedLine===X.generatedLine?K.generatedOffset.generatedColumn-1:0),bias:Y.bias})};k.prototype.hasContentsOfAllSources=function(){return this._sections.every(function(Y){return Y.consumer.hasContentsOfAllSources()})};k.prototype.sourceContentFor=function(Y,X){for(var z=0;z<this._sections.length;z++){var K=this._sections[z],Z=K.consumer.sourceContentFor(Y,!0);if(Z)return Z}if(X)return null;else throw Error('"'+Y+'" is not in the SourceMap.')};k.prototype.generatedPositionFor=function(Y){for(var X=0;X<this._sections.length;X++){var z=this._sections[X];if(z.consumer._findSourceIndex(Q.getArg(Y,"source"))===-1)continue;var K=z.consumer.generatedPositionFor(Y);if(K){var Z={line:K.line+(z.generatedOffset.generatedLine-1),column:K.column+(z.generatedOffset.generatedLine===K.line?z.generatedOffset.generatedColumn-1:0)};return Z}}return{line:null,column:null}};k.prototype._parseMappings=function(Y,X){this.__generatedMappings=[],this.__originalMappings=[];for(var z=0;z<this._sections.length;z++){var K=this._sections[z],Z=K.consumer._generatedMappings;for(var $=0;$<Z.length;$++){var q=Z[$],W=K.consumer._sources.at(q.source);W=Q.computeSourceURL(K.consumer.sourceRoot,W,this._sourceMapURL),this._sources.add(W),W=this._sources.indexOf(W);var D=null;if(q.name)D=K.consumer._names.at(q.name),this._names.add(D),D=this._names.indexOf(D);var T={source:W,generatedLine:q.generatedLine+(K.generatedOffset.generatedLine-1),generatedColumn:q.generatedColumn+(K.generatedOffset.generatedLine===q.generatedLine?K.generatedOffset.generatedColumn-1:0),originalLine:q.originalLine,originalColumn:q.originalColumn,name:D};if(this.__generatedMappings.push(T),typeof T.originalLine==="number")this.__originalMappings.push(T)}}m(this.__generatedMappings,Q.compareByGeneratedPositionsDeflated),m(this.__originalMappings,Q.compareByOriginalPositions)};o.IndexedSourceMapConsumer=k});var c0=F((m0)=>{var G8=$0().SourceMapGenerator,n=S(),b8=/(\r?\n)/,I8=10,d="$$$isSourceNode$$$";function B(J,Y,X,z,K){if(this.children=[],this.sourceContents={},this.line=J==null?null:J,this.column=Y==null?null:Y,this.source=X==null?null:X,this.name=K==null?null:K,this[d]=!0,z!=null)this.add(z)}B.fromStringWithSourceMap=function(Y,X,z){var K=new B,Z=Y.split(b8),$=0,q=function(){var _=O(),V=O()||"";return _+V;function O(){return $<Z.length?Z[$++]:void 0}},W=1,D=0,T=null;if(X.eachMapping(function(_){if(T!==null)if(W<_.generatedLine)E(T,q()),W++,D=0;else{var V=Z[$]||"",O=V.substr(0,_.generatedColumn-D);Z[$]=V.substr(_.generatedColumn-D),D=_.generatedColumn,E(T,O),T=_;return}while(W<_.generatedLine)K.add(q()),W++;if(D<_.generatedColumn){var V=Z[$]||"";K.add(V.substr(0,_.generatedColumn)),Z[$]=V.substr(_.generatedColumn),D=_.generatedColumn}T=_},this),$<Z.length){if(T)E(T,q());K.add(Z.splice($).join(""))}return X.sources.forEach(function(_){var V=X.sourceContentFor(_);if(V!=null){if(z!=null)_=n.join(z,_);K.setSourceContent(_,V)}}),K;function E(_,V){if(_===null||_.source===void 0)K.add(V);else{var O=z?n.join(z,_.source):_.source;K.add(new B(_.originalLine,_.originalColumn,O,V,_.name))}}};B.prototype.add=function(Y){if(Array.isArray(Y))Y.forEach(function(X){this.add(X)},this);else if(Y[d]||typeof Y==="string"){if(Y)this.children.push(Y)}else throw TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+Y);return this};B.prototype.prepend=function(Y){if(Array.isArray(Y))for(var X=Y.length-1;X>=0;X--)this.prepend(Y[X]);else if(Y[d]||typeof Y==="string")this.children.unshift(Y);else throw TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got "+Y);return this};B.prototype.walk=function(Y){var X;for(var z=0,K=this.children.length;z<K;z++)if(X=this.children[z],X[d])X.walk(Y);else if(X!=="")Y(X,{source:this.source,line:this.line,column:this.column,name:this.name})};B.prototype.join=function(Y){var X,z,K=this.children.length;if(K>0){X=[];for(z=0;z<K-1;z++)X.push(this.children[z]),X.push(Y);X.push(this.children[z]),this.children=X}return this};B.prototype.replaceRight=function(Y,X){var z=this.children[this.children.length-1];if(z[d])z.replaceRight(Y,X);else if(typeof z==="string")this.children[this.children.length-1]=z.replace(Y,X);else this.children.push("".replace(Y,X));return this};B.prototype.setSourceContent=function(Y,X){this.sourceContents[n.toSetString(Y)]=X};B.prototype.walkSourceContents=function(Y){for(var X=0,z=this.children.length;X<z;X++)if(this.children[X][d])this.children[X].walkSourceContents(Y);var K=Object.keys(this.sourceContents);for(var X=0,z=K.length;X<z;X++)Y(n.fromSetString(K[X]),this.sourceContents[K[X]])};B.prototype.toString=function(){var Y="";return this.walk(function(X){Y+=X}),Y};B.prototype.toStringWithSourceMap=function(Y){var X={code:"",line:1,column:0},z=new G8(Y),K=!1,Z=null,$=null,q=null,W=null;return this.walk(function(D,T){if(X.code+=D,T.source!==null&&T.line!==null&&T.column!==null){if(Z!==T.source||$!==T.line||q!==T.column||W!==T.name)z.addMapping({source:T.source,original:{line:T.line,column:T.column},generated:{line:X.line,column:X.column},name:T.name});Z=T.source,$=T.line,q=T.column,W=T.name,K=!0}else if(K)z.addMapping({generated:{line:X.line,column:X.column}}),Z=null,K=!1;for(var E=0,_=D.length;E<_;E++)if(D.charCodeAt(E)===I8){if(X.line++,X.column=0,E+1===_)Z=null,K=!1;else if(K)z.addMapping({source:T.source,original:{line:T.line,column:T.column},generated:{line:X.line,column:X.column},name:T.name})}else X.column++}),this.walkSourceContents(function(D,T){z.setSourceContent(D,T)}),{code:X.code,map:z}};m0.SourceNode=B});var u0=F((i)=>{i.SourceMapGenerator=$0().SourceMapGenerator;i.SourceMapConsumer=l0().SourceMapConsumer;i.SourceNode=c0().SourceNode});var t0=F((e8,s0)=>{var F8=Object.prototype.toString,Q0=typeof Buffer<"u"&&typeof Buffer.alloc==="function"&&typeof Buffer.allocUnsafe==="function"&&typeof Buffer.from==="function";function B8(J){return F8.call(J).slice(8,-1)==="ArrayBuffer"}function O8(J,Y,X){Y>>>=0;var z=J.byteLength-Y;if(z<0)throw RangeError("'offset' is out of bounds");if(X===void 0)X=z;else if(X>>>=0,X>z)throw RangeError("'length' is out of bounds");return Q0?Buffer.from(J.slice(Y,Y+X)):new Buffer(new Uint8Array(J.slice(Y,Y+X)))}function U8(J,Y){if(typeof Y!=="string"||Y==="")Y="utf8";if(!Buffer.isEncoding(Y))throw TypeError('"encoding" must be a valid string encoding');return Q0?Buffer.from(J,Y):new Buffer(J,Y)}function k8(J,Y,X){if(typeof J==="number")throw TypeError('"value" argument must not be a number');if(B8(J))return O8(J,Y,X);if(typeof J==="string")return U8(J,Y);return Q0?Buffer.from(J):new Buffer(J)}s0.exports=k8});var Y8=F((A,j0)=>{var y8=u0().SourceMapConsumer,_0=require("path"),y;try{if(y=require("fs"),!y.existsSync||!y.readFileSync)y=null}catch(J){}var P8=t0();function p0(J,Y){return J.require(Y)}var o0=!1,n0=!1,E0=!1,c="auto",R={},u={},f8=/^data:application\/json[^,]+base64,/,f=[],v=[];function w0(){if(c==="browser")return!0;if(c==="node")return!1;return typeof window<"u"&&typeof XMLHttpRequest==="function"&&!(window.require&&window.module&&window.process&&window.process.type==="renderer")}function v8(){return typeof process==="object"&&process!==null&&typeof process.on==="function"}function N8(){if(typeof process==="object"&&process!==null)return process.version;else return""}function L8(){if(typeof process==="object"&&process!==null)return process.stderr}function R8(J){if(typeof process==="object"&&process!==null&&typeof process.exit==="function")return process.exit(J)}function r(J){return function(Y){for(var X=0;X<J.length;X++){var z=J[X](Y);if(z)return z}return null}}var H0=r(f);f.push(function(J){if(J=J.trim(),/^file:/.test(J))J=J.replace(/file:\/\/\/(\w:)?/,function(z,K){return K?"":"/"});if(J in R)return R[J];var Y="";try{if(!y){var X=new XMLHttpRequest;if(X.open("GET",J,!1),X.send(null),X.readyState===4&&X.status===200)Y=X.responseText}else if(y.existsSync(J))Y=y.readFileSync(J,"utf8")}catch(z){}return R[J]=Y});function V0(J,Y){if(!J)return Y;var X=_0.dirname(J),z=/^\w+:\/\/[^\/]*/.exec(X),K=z?z[0]:"",Z=X.slice(K.length);if(K&&/^\/\w\:/.test(Z))return K+="/",K+_0.resolve(X.slice(K.length),Y).replace(/\\/g,"/");return K+_0.resolve(X.slice(K.length),Y)}function A8(J){var Y;if(w0())try{var X=new XMLHttpRequest;X.open("GET",J,!1),X.send(null),Y=X.readyState===4?X.responseText:null;var z=X.getResponseHeader("SourceMap")||X.getResponseHeader("X-SourceMap");if(z)return z}catch(q){}Y=H0(J);var K=/(?:\/\/[@#][\s]*sourceMappingURL=([^\s'"]+)[\s]*$)|(?:\/\*[@#][\s]*sourceMappingURL=([^\s*'"]+)[\s]*(?:\*\/)[\s]*$)/mg,Z,$;while($=K.exec(Y))Z=$;if(!Z)return null;return Z[1]}var G0=r(v);v.push(function(J){var Y=A8(J);if(!Y)return null;var X;if(f8.test(Y)){var z=Y.slice(Y.indexOf(",")+1);X=P8(z,"base64").toString(),Y=J}else Y=V0(J,Y),X=H0(Y);if(!X)return null;return{url:Y,map:X}});function b0(J){var Y=u[J.source];if(!Y){var X=G0(J.source);if(X){if(Y=u[J.source]={url:X.url,map:new y8(X.map)},Y.map.sourcesContent)Y.map.sources.forEach(function(K,Z){var $=Y.map.sourcesContent[Z];if($){var q=V0(Y.url,K);R[q]=$}})}else Y=u[J.source]={url:null,map:null}}if(Y&&Y.map&&typeof Y.map.originalPositionFor==="function"){var z=Y.map.originalPositionFor(J);if(z.source!==null)return z.source=V0(Y.url,z.source),z}return J}function r0(J){var Y=/^eval at ([^(]+) \((.+):(\d+):(\d+)\)$/.exec(J);if(Y){var X=b0({source:Y[2],line:+Y[3],column:Y[4]-1});return"eval at "+Y[1]+" ("+X.source+":"+X.line+":"+(X.column+1)+")"}if(Y=/^eval at ([^(]+) \((.+)\)$/.exec(J),Y)return"eval at "+Y[1]+" ("+r0(Y[2])+")";return J}function x8(){var J,Y="";if(this.isNative())Y="native";else{if(J=this.getScriptNameOrSourceURL(),!J&&this.isEval())Y=this.getEvalOrigin(),Y+=", ";if(J)Y+=J;else Y+="<anonymous>";var X=this.getLineNumber();if(X!=null){Y+=":"+X;var z=this.getColumnNumber();if(z)Y+=":"+z}}var K="",Z=this.getFunctionName(),$=!0,q=this.isConstructor(),W=!(this.isToplevel()||q);if(W){var D=this.getTypeName();if(D==="[object Object]")D="null";var T=this.getMethodName();if(Z){if(D&&Z.indexOf(D)!=0)K+=D+".";if(K+=Z,T&&Z.indexOf("."+T)!=Z.length-T.length-1)K+=" [as "+T+"]"}else K+=D+"."+(T||"<anonymous>")}else if(q)K+="new "+(Z||"<anonymous>");else if(Z)K+=Z;else K+=Y,$=!1;if($)K+=" ("+Y+")";return K}function i0(J){var Y={};return Object.getOwnPropertyNames(Object.getPrototypeOf(J)).forEach(function(X){Y[X]=/^(?:is|get)/.test(X)?function(){return J[X].call(J)}:J[X]}),Y.toString=x8,Y}function e0(J,Y){if(Y===void 0)Y={nextPosition:null,curPosition:null};if(J.isNative())return Y.curPosition=null,J;var X=J.getFileName()||J.getScriptNameOrSourceURL();if(X){var z=J.getLineNumber(),K=J.getColumnNumber()-1,Z=/^v(10\.1[6-9]|10\.[2-9][0-9]|10\.[0-9]{3,}|1[2-9]\d*|[2-9]\d|\d{3,}|11\.11)/,$=Z.test(N8())?0:62;if(z===1&&K>$&&!w0()&&!J.isEval())K-=$;var q=b0({source:X,line:z,column:K});Y.curPosition=q,J=i0(J);var W=J.getFunctionName;return J.getFunctionName=function(){if(Y.nextPosition==null)return W();return Y.nextPosition.name||W()},J.getFileName=function(){return q.source},J.getLineNumber=function(){return q.line},J.getColumnNumber=function(){return q.column+1},J.getScriptNameOrSourceURL=function(){return q.source},J}var D=J.isEval()&&J.getEvalOrigin();if(D)return D=r0(D),J=i0(J),J.getEvalOrigin=function(){return D},J;return J}function C8(J,Y){if(E0)R={},u={};var X=J.name||"Error",z=J.message||"",K=X+": "+z,Z={nextPosition:null,curPosition:null},$=[];for(var q=Y.length-1;q>=0;q--)$.push(`
    at `+e0(Y[q],Z)),Z.nextPosition=Z.curPosition;return Z.curPosition=Z.nextPosition=null,K+$.reverse().join("")}function a0(J){var Y=/\n    at [^(]+ \((.*):(\d+):(\d+)\)/.exec(J.stack);if(Y){var X=Y[1],z=+Y[2],K=+Y[3],Z=R[X];if(!Z&&y&&y.existsSync(X))try{Z=y.readFileSync(X,"utf8")}catch(q){Z=""}if(Z){var $=Z.split(/(?:\r\n|\r|\n)/)[z-1];if($)return X+":"+z+`
`+$+`
`+Array(K).join(" ")+"^"}}return null}function M8(J){var Y=a0(J),X=L8();if(X&&X._handle&&X._handle.setBlocking)X._handle.setBlocking(!0);if(Y)console.error(),console.error(Y);console.error(J.stack),R8(1)}function S8(){var J=process.emit;process.emit=function(Y){if(Y==="uncaughtException"){var X=arguments[1]&&arguments[1].stack,z=this.listeners(Y).length>0;if(X&&!z)return M8(arguments[1])}return J.apply(this,arguments)}}var h8=f.slice(0),d8=v.slice(0);A.wrapCallSite=e0;A.getErrorSource=a0;A.mapSourcePosition=b0;A.retrieveSourceMap=G0;A.install=function(J){if(J=J||{},J.environment){if(c=J.environment,["node","browser","auto"].indexOf(c)===-1)throw Error("environment "+c+" was unknown. Available options are {auto, browser, node}")}if(J.retrieveFile){if(J.overrideRetrieveFile)f.length=0;f.unshift(J.retrieveFile)}if(J.retrieveSourceMap){if(J.overrideRetrieveSourceMap)v.length=0;v.unshift(J.retrieveSourceMap)}if(J.hookRequire&&!w0()){var Y=p0(j0,"module"),X=Y.prototype._compile;if(!X.__sourceMapSupport)Y.prototype._compile=function(Z,$){return R[$]=Z,u[$]=void 0,X.call(this,Z,$)},Y.prototype._compile.__sourceMapSupport=!0}if(!E0)E0="emptyCacheBetweenOperations"in J?J.emptyCacheBetweenOperations:!1;if(!o0)o0=!0,Error.prepareStackTrace=C8;if(!n0){var z="handleUncaughtExceptions"in J?J.handleUncaughtExceptions:!0;try{var K=p0(j0,"worker_threads");if(K.isMainThread===!1)z=!1}catch(Z){}if(z&&v8())n0=!0,S8()}};A.resetRetrieveHandlers=function(){f.length=0,v.length=0,f=h8.slice(0),v=d8.slice(0),G0=r(v),H0=r(f)}});Y8().install({environment:"node",handleUncaughtExceptions:!1});
var import_node_module = require("node:module");
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// src/api/npm/ts/index.ts
var exports_ts = {};
__export(exports_ts, {
  defineConfig: () => defineConfig,
  WorkerService: () => WorkerService,
  WebService: () => WebService,
  WebAppFirewall: () => WebAppFirewall,
  UserAuthPool: () => UserAuthPool,
  UpstashRedis: () => UpstashRedis,
  StateMachine: () => StateMachine,
  StacktapeLambdaBuildpackPackaging: () => StacktapeLambdaBuildpackPackaging,
  StacktapeImageBuildpackPackaging: () => StacktapeImageBuildpackPackaging,
  SqsQueueReceivedMessagesCountTrigger: () => SqsQueueReceivedMessagesCountTrigger,
  SqsQueueNotEmptyTrigger: () => SqsQueueNotEmptyTrigger,
  SqsQueueEventBusIntegration: () => SqsQueueEventBusIntegration,
  SqsQueue: () => SqsQueue,
  SqsIntegration: () => SqsIntegration,
  SnsTopic: () => SnsTopic,
  SnsIntegration: () => SnsIntegration,
  ScheduleIntegration: () => ScheduleIntegration,
  S3Integration: () => S3Integration,
  RelationalDatabaseWriteLatencyTrigger: () => RelationalDatabaseWriteLatencyTrigger,
  RelationalDatabaseReadLatencyTrigger: () => RelationalDatabaseReadLatencyTrigger,
  RelationalDatabaseFreeStorageTrigger: () => RelationalDatabaseFreeStorageTrigger,
  RelationalDatabaseFreeMemoryTrigger: () => RelationalDatabaseFreeMemoryTrigger,
  RelationalDatabaseConnectionCountTrigger: () => RelationalDatabaseConnectionCountTrigger,
  RelationalDatabaseCPUUtilizationTrigger: () => RelationalDatabaseCPUUtilizationTrigger,
  RelationalDatabase: () => RelationalDatabase,
  RedisCluster: () => RedisCluster,
  RdsEngineSqlServerWeb: () => RdsEngineSqlServerWeb,
  RdsEngineSqlServerSE: () => RdsEngineSqlServerSE,
  RdsEngineSqlServerEX: () => RdsEngineSqlServerEX,
  RdsEngineSqlServerEE: () => RdsEngineSqlServerEE,
  RdsEnginePostgres: () => RdsEnginePostgres,
  RdsEngineOracleSE2: () => RdsEngineOracleSE2,
  RdsEngineOracleEE: () => RdsEngineOracleEE,
  RdsEngineMysql: () => RdsEngineMysql,
  RdsEngineMariadb: () => RdsEngineMariadb,
  RateBasedRule: () => RateBasedRule,
  PrivateService: () => PrivateService,
  PrebuiltImagePackaging: () => PrebuiltImagePackaging,
  OpenSearchDomain: () => OpenSearchDomain,
  NonCurrentVersionExpirationLifecycleRule: () => NonCurrentVersionExpirationLifecycleRule,
  NixpacksPackaging: () => NixpacksPackaging,
  NextjsWeb: () => NextjsWeb,
  NetworkLoadBalancer: () => NetworkLoadBalancer,
  MultiContainerWorkloadServiceConnectIntegration: () => MultiContainerWorkloadServiceConnectIntegration,
  MultiContainerWorkloadNetworkLoadBalancerIntegration: () => MultiContainerWorkloadNetworkLoadBalancerIntegration,
  MultiContainerWorkloadLoadBalancerIntegration: () => MultiContainerWorkloadLoadBalancerIntegration,
  MultiContainerWorkloadInternalIntegration: () => MultiContainerWorkloadInternalIntegration,
  MultiContainerWorkloadHttpApiIntegration: () => MultiContainerWorkloadHttpApiIntegration,
  MultiContainerWorkload: () => MultiContainerWorkload,
  MongoDbAtlasCluster: () => MongoDbAtlasCluster,
  ManagedRuleGroup: () => ManagedRuleGroup,
  LocalScriptWithBastionTunneling: () => LocalScriptWithBastionTunneling,
  LocalScript: () => LocalScript,
  LambdaFunction: () => LambdaFunction,
  LambdaErrorRateTrigger: () => LambdaErrorRateTrigger,
  LambdaEfsMount: () => LambdaEfsMount,
  LambdaDurationTrigger: () => LambdaDurationTrigger,
  LambdaAuthorizer: () => LambdaAuthorizer,
  KinesisStream: () => KinesisStream,
  KinesisIntegration: () => KinesisIntegration,
  KafkaTopicIntegration: () => KafkaTopicIntegration,
  IotIntegration: () => IotIntegration,
  HttpEndpointLogForwarding: () => HttpEndpointLogForwarding,
  HttpApiIntegration: () => HttpApiIntegration,
  HttpApiGatewayLatencyTrigger: () => HttpApiGatewayLatencyTrigger,
  HttpApiGatewayErrorRateTrigger: () => HttpApiGatewayErrorRateTrigger,
  HttpApiGateway: () => HttpApiGateway,
  HostingBucket: () => HostingBucket,
  HighlightLogForwarding: () => HighlightLogForwarding,
  ExternalBuildpackPackaging: () => ExternalBuildpackPackaging,
  ExpirationLifecycleRule: () => ExpirationLifecycleRule,
  EventBusIntegration: () => EventBusIntegration,
  EventBus: () => EventBus,
  EfsFilesystem: () => EfsFilesystem,
  EdgeLambdaFunction: () => EdgeLambdaFunction,
  DynamoDbTable: () => DynamoDbTable,
  DynamoDbIntegration: () => DynamoDbIntegration,
  DeploymentScript: () => DeploymentScript,
  DatadogLogForwarding: () => DatadogLogForwarding,
  CustomRuleGroup: () => CustomRuleGroup,
  CustomResourceInstance: () => CustomResourceInstance,
  CustomResourceDefinition: () => CustomResourceDefinition,
  CustomDockerfilePackaging: () => CustomDockerfilePackaging,
  CustomArtifactLambdaPackaging: () => CustomArtifactLambdaPackaging,
  ContainerEfsMount: () => ContainerEfsMount,
  CognitoAuthorizer: () => CognitoAuthorizer,
  CloudwatchLogIntegration: () => CloudwatchLogIntegration,
  CdnLoadBalancerRoute: () => CdnLoadBalancerRoute,
  CdnLambdaFunctionRoute: () => CdnLambdaFunctionRoute,
  CdnHttpApiGatewayRoute: () => CdnHttpApiGatewayRoute,
  CdnCustomDomainRoute: () => CdnCustomDomainRoute,
  CdnBucketRoute: () => CdnBucketRoute,
  Bucket: () => Bucket,
  BatchJob: () => BatchJob,
  BastionScript: () => BastionScript,
  Bastion: () => Bastion,
  AuroraServerlessV2EnginePostgresql: () => AuroraServerlessV2EnginePostgresql,
  AuroraServerlessV2EngineMysql: () => AuroraServerlessV2EngineMysql,
  AuroraServerlessEnginePostgresql: () => AuroraServerlessEnginePostgresql,
  AuroraServerlessEngineMysql: () => AuroraServerlessEngineMysql,
  AuroraEnginePostgresql: () => AuroraEnginePostgresql,
  AuroraEngineMysql: () => AuroraEngineMysql,
  ApplicationLoadBalancerUnhealthyTargetsTrigger: () => ApplicationLoadBalancerUnhealthyTargetsTrigger,
  ApplicationLoadBalancerIntegration: () => ApplicationLoadBalancerIntegration,
  ApplicationLoadBalancerErrorRateTrigger: () => ApplicationLoadBalancerErrorRateTrigger,
  ApplicationLoadBalancerCustomTrigger: () => ApplicationLoadBalancerCustomTrigger,
  ApplicationLoadBalancer: () => ApplicationLoadBalancer,
  AlarmIntegration: () => AlarmIntegration,
  Alarm: () => Alarm,
  AWS_SES: () => AWS_SES,
  $Stage: () => $Stage,
  $SsmParam: () => $SsmParam,
  $Secret: () => $Secret,
  $ResourceParam: () => $ResourceParam,
  $Region: () => $Region,
  $GitInfo: () => $GitInfo,
  $CfStackOutput: () => $CfStackOutput,
  $CfResourceParam: () => $CfResourceParam,
  $CfFormat: () => $CfFormat
});
module.exports = __toCommonJS(exports_ts);

// node_modules/change-case/dist/index.js
var SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu;
var SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;
var SPLIT_SEPARATE_NUMBER_RE = /(\d)\p{Ll}|(\p{L})\d/u;
var DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu;
var SPLIT_REPLACE_VALUE = "$1\x00$2";
var DEFAULT_PREFIX_SUFFIX_CHARACTERS = "";
function split(value) {
  let result = value.trim();
  result = result.replace(SPLIT_LOWER_UPPER_RE, SPLIT_REPLACE_VALUE).replace(SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE);
  result = result.replace(DEFAULT_STRIP_REGEXP, "\x00");
  let start = 0;
  let end = result.length;
  while (result.charAt(start) === "\x00")
    start++;
  if (start === end)
    return [];
  while (result.charAt(end - 1) === "\x00")
    end--;
  return result.slice(start, end).split(/\0/g);
}
function splitSeparateNumbers(value) {
  const words = split(value);
  for (let i = 0;i < words.length; i++) {
    const word = words[i];
    const match = SPLIT_SEPARATE_NUMBER_RE.exec(word);
    if (match) {
      const offset = match.index + (match[1] ?? match[2]).length;
      words.splice(i, 1, word.slice(0, offset), word.slice(offset));
    }
  }
  return words;
}
function pascalCase(input, options) {
  const [prefix, words, suffix] = splitPrefixSuffix(input, options);
  const lower = lowerFactory(options?.locale);
  const upper = upperFactory(options?.locale);
  const transform = options?.mergeAmbiguousCharacters ? capitalCaseTransformFactory(lower, upper) : pascalCaseTransformFactory(lower, upper);
  return prefix + words.map(transform).join(options?.delimiter ?? "") + suffix;
}
function lowerFactory(locale) {
  return locale === false ? (input) => input.toLowerCase() : (input) => input.toLocaleLowerCase(locale);
}
function upperFactory(locale) {
  return locale === false ? (input) => input.toUpperCase() : (input) => input.toLocaleUpperCase(locale);
}
function capitalCaseTransformFactory(lower, upper) {
  return (word) => `${upper(word[0])}${lower(word.slice(1))}`;
}
function pascalCaseTransformFactory(lower, upper) {
  return (word, index) => {
    const char0 = word[0];
    const initial = index > 0 && char0 >= "0" && char0 <= "9" ? "_" + char0 : upper(char0);
    return initial + lower(word.slice(1));
  };
}
function splitPrefixSuffix(input, options = {}) {
  const splitFn = options.split ?? (options.separateNumbers ? splitSeparateNumbers : split);
  const prefixCharacters = options.prefixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
  const suffixCharacters = options.suffixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
  let prefixIndex = 0;
  let suffixIndex = input.length;
  while (prefixIndex < input.length) {
    const char = input.charAt(prefixIndex);
    if (!prefixCharacters.includes(char))
      break;
    prefixIndex++;
  }
  while (suffixIndex > prefixIndex) {
    const index = suffixIndex - 1;
    const char = input.charAt(index);
    if (!suffixCharacters.includes(char))
      break;
    suffixIndex = index;
  }
  return [
    input.slice(0, prefixIndex),
    splitFn(input.slice(prefixIndex, suffixIndex)),
    input.slice(suffixIndex)
  ];
}

// shared/naming/logical-names.ts
var cfLogicalNames = {
  bucket(stpResourceName) {
    return pascalCase(`${stpResourceName}-bucket`);
  },
  atlasMongoProject() {
    return buildCfLogicalName({
      specifier: { type: "AtlasMongo" },
      suffix: { cloudformationResourceType: "MongoDB::StpAtlasV1::Project" }
    });
  },
  atlasMongoCredentialsProvider() {
    return buildCfLogicalName({
      specifier: { type: "AtlasMongoCredentialsProvider" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  atlasMongoProjectVpcNetworkContainer() {
    return buildCfLogicalName({
      specifier: { type: "AtlasMongo" },
      suffix: { cloudformationResourceType: "MongoDB::StpAtlasV1::NetworkContainer" }
    });
  },
  atlasMongoProjectVpcNetworkPeering() {
    return buildCfLogicalName({
      specifier: { type: "AtlasMongo" },
      suffix: { cloudformationResourceType: "MongoDB::StpAtlasV1::NetworkPeering" }
    });
  },
  atlasMongoProjectIpAccessList() {
    return buildCfLogicalName({
      specifier: { type: "AtlasMongo" },
      suffix: { cloudformationResourceType: "MongoDB::StpAtlasV1::ProjectIpAccessList" }
    });
  },
  atlasMongoUserAssociatedWithRole(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "AtlasMongo" },
      suffix: { cloudformationResourceType: "MongoDB::StpAtlasV1::DatabaseUser" }
    });
  },
  atlasMongoClusterMasterUser(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "MongoDB::StpAtlasV1::DatabaseUser" }
    });
  },
  atlasMongoCluster(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "MongoDB::StpAtlasV1::Cluster" }
    });
  },
  redisReplicationGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ElastiCache::ReplicationGroup" }
    });
  },
  redisLogGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Logs::LogGroup" }
    });
  },
  redisParameterGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ElastiCache::ParameterGroup" }
    });
  },
  redisSubnetGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ElastiCache::SubnetGroup" }
    });
  },
  redisSecurityGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::EC2::SecurityGroup" }
    });
  },
  efsFilesystem(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: {
        cloudformationResourceType: "AWS::EFS::FileSystem"
      }
    });
  },
  efsAccessPoint({
    stpResourceName,
    efsFilesystemName,
    rootDirectory
  }) {
    const rootDirIdentifier = rootDirectory ? `${rootDirectory.replace(/\//g, "-").replace(/^-|-$/g, "")}` : "Root";
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: `${efsFilesystemName}-${rootDirIdentifier}`
      },
      suffix: {
        cloudformationResourceType: "AWS::EFS::AccessPoint"
      }
    });
  },
  efsMountTarget(stpResourceName, mountTargetIndex) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Subnet", typeIndex: mountTargetIndex },
      suffix: { cloudformationResourceType: "AWS::EFS::MountTarget" }
    });
  },
  efsSecurityGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::EC2::SecurityGroup" }
    });
  },
  snsRoleSendSmsFromCognito(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "SendSms" },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  cloudfrontDistribution(stpResourceName, distributionIndex) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "CDN" },
      suffix: { cloudformationResourceType: "AWS::CloudFront::Distribution", index: distributionIndex }
    });
  },
  cloudfrontCustomCachePolicy(stpResourceName, cachingOptionsHash) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `CDNCacheBehavior${cachingOptionsHash}` },
      suffix: { cloudformationResourceType: "AWS::CloudFront::CachePolicy" }
    });
  },
  cloudfrontDefaultCachePolicy(type) {
    return buildCfLogicalName({
      specifier: { type: `CDN${type}` },
      suffix: { cloudformationResourceType: "AWS::CloudFront::CachePolicy" }
    });
  },
  cloudfrontCustomOriginRequestPolicy(stpResourceName, forwardingOptionsHash) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `CDNCacheBehavior${forwardingOptionsHash}` },
      suffix: { cloudformationResourceType: "AWS::CloudFront::OriginRequestPolicy" }
    });
  },
  cloudfrontDefaultOriginRequestPolicy(type) {
    return buildCfLogicalName({
      specifier: { type: `CDN${type}` },
      suffix: { cloudformationResourceType: "AWS::CloudFront::OriginRequestPolicy" }
    });
  },
  cloudfrontOriginAccessIdentity(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "CDN" },
      suffix: { cloudformationResourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity" }
    });
  },
  openNextHostHeaderRewriteFunction(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "OpenNextHostHeaderRewrite" },
      suffix: { cloudformationResourceType: "AWS::CloudFront::Function" }
    });
  },
  ssrWebHostHeaderRewriteFunction(stpResourceName, resourceType) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `${resourceType.replace(/-/g, "")}HostHeaderRewrite` },
      suffix: { cloudformationResourceType: "AWS::CloudFront::Function" }
    });
  },
  openNextAssetReplacerCustomResource(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "AssetReplacer" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  openNextDynamoInsertCustomResource(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "DynamoInsert" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  dnsRecord(fullyQualifiedDomainName) {
    return buildCfLogicalName({
      stpResourceName: "",
      specifier: { type: getSpecifierForDomainResource(fullyQualifiedDomainName) },
      suffix: { cloudformationResourceType: "AWS::Route53::RecordSet" }
    });
  },
  dynamoGlobalTable(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::DynamoDB::GlobalTable" }
    });
  },
  dynamoRegionalTable(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::DynamoDB::Table" }
    });
  },
  bucketPolicy(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::S3::BucketPolicy" }
    });
  },
  lambdaLogGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Logs::LogGroup" }
    });
  },
  eventOnDeliveryFailureSqsQueuePolicy(stpResourceName, eventIndex) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: "Event",
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: "AWS::SQS::QueuePolicy" }
    });
  },
  snsEventSubscription(stpResourceName, eventIndex) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: "Event",
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: "AWS::SNS::Subscription" }
    });
  },
  snsEventPermission(stpResourceName, eventIndex) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: "Event",
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: "AWS::Lambda::Permission" }
    });
  },
  ecrRepo() {
    return buildCfLogicalName({
      specifier: {
        type: "Container"
      },
      suffix: { cloudformationResourceType: "AWS::ECR::Repository" }
    });
  },
  deploymentBucket() {
    return buildCfLogicalName({
      specifier: {
        type: "Deployment"
      },
      suffix: { cloudformationResourceType: "AWS::S3::Bucket" }
    });
  },
  deploymentBucketPolicy() {
    return buildCfLogicalName({
      specifier: {
        type: "Deployment"
      },
      suffix: { cloudformationResourceType: "AWS::S3::BucketPolicy" }
    });
  },
  lambdaInvokeConfig(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Lambda::EventInvokeConfig" }
    });
  },
  lambdaVersionPublisherCustomResource(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Version" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  codeDeployServiceRole() {
    return buildCfLogicalName({
      specifier: {
        type: "CodeDeploy"
      },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  batchInstanceRole() {
    return buildCfLogicalName({
      specifier: {
        type: "BatchInstance"
      },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  batchInstanceDefaultSecurityGroup() {
    return buildCfLogicalName({
      specifier: {
        type: "BatchInstance"
      },
      suffix: { cloudformationResourceType: "AWS::EC2::SecurityGroup" }
    });
  },
  batchInstanceProfile() {
    return buildCfLogicalName({
      specifier: {
        type: "BatchInstance"
      },
      suffix: { cloudformationResourceType: "AWS::IAM::InstanceProfile" }
    });
  },
  batchInstanceLaunchTemplate() {
    return buildCfLogicalName({
      specifier: {
        type: "BatchInstance"
      },
      suffix: { cloudformationResourceType: "AWS::EC2::LaunchTemplate" }
    });
  },
  batchStateMachineExecutionRole() {
    return buildCfLogicalName({
      specifier: {
        type: "BatchStateMachine"
      },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  batchSpotFleetRole() {
    return buildCfLogicalName({
      specifier: {
        type: "BatchSpotFleet"
      },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  batchServiceRole() {
    return buildCfLogicalName({
      specifier: {
        type: "BatchService"
      },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  batchJobExecutionRole(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  batchComputeEnvironment(spot, gpu) {
    return buildCfLogicalName({
      specifier: {
        type: `Batch-${spot ? "spot" : "onDemand"}-${gpu ? "gpu" : ""}`
      },
      suffix: { cloudformationResourceType: "AWS::Batch::ComputeEnvironment" }
    });
  },
  batchJobQueue(spot, gpu) {
    return buildCfLogicalName({
      specifier: {
        type: `Batch-${spot ? "spot" : "onDemand"}-${gpu ? "gpu" : ""}`
      },
      suffix: { cloudformationResourceType: "AWS::Batch::JobQueue" }
    });
  },
  subnet(publicSubnet, subnetIndex) {
    return buildCfLogicalName({
      specifier: {
        type: publicSubnet ? "Public" : "Private"
      },
      suffix: { cloudformationResourceType: "AWS::EC2::Subnet", index: subnetIndex }
    });
  },
  vpc() {
    return buildCfLogicalName({
      suffix: { cloudformationResourceType: "AWS::EC2::VPC" }
    });
  },
  vpcGatewayEndpoint(type) {
    return buildCfLogicalName({
      specifier: { type: `${type}-Gateway` },
      suffix: { cloudformationResourceType: "AWS::EC2::VPCEndpoint" }
    });
  },
  dbSubnetGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::RDS::DBSubnetGroup" }
    });
  },
  auroraDbCluster(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::RDS::DBCluster" }
    });
  },
  auroraDbClusterParameterGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::RDS::DBClusterParameterGroup" }
    });
  },
  auroraDbClusterLogGroup(stpResourceName, logGroupType) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Cluster", subtype: logGroupType },
      suffix: { cloudformationResourceType: "AWS::Logs::LogGroup" }
    });
  },
  dbSecurityGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::EC2::SecurityGroup" }
    });
  },
  dbInstance(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::RDS::DBInstance" }
    });
  },
  dbInstanceLogGroup(stpResourceName, logGroupType) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Instance", subtype: logGroupType },
      suffix: { cloudformationResourceType: "AWS::Logs::LogGroup" }
    });
  },
  openSearchDomainLogGroup(stpResourceName, logGroupType) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Instance", subtype: logGroupType },
      suffix: { cloudformationResourceType: "AWS::Logs::LogGroup" }
    });
  },
  dbOptionGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::RDS::OptionGroup" }
    });
  },
  dbInstanceParameterGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::RDS::DBParameterGroup" }
    });
  },
  dbReplica(stpResourceName, replicaNum) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Replica", typeIndex: replicaNum },
      suffix: { cloudformationResourceType: "AWS::RDS::DBInstance" }
    });
  },
  dbReplicaLogGroup(stpResourceName, logGroupType, replicaNum) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Replica", typeIndex: replicaNum, subtype: logGroupType },
      suffix: { cloudformationResourceType: "AWS::Logs::LogGroup" }
    });
  },
  dbReplicaParameterGroup(stpResourceName, replicaNum) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Replica", typeIndex: replicaNum },
      suffix: { cloudformationResourceType: "AWS::RDS::DBParameterGroup" }
    });
  },
  auroraDbInstance(stpResourceName, instanceNum) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::RDS::DBInstance", index: instanceNum }
    });
  },
  auroraDbInstanceParameterGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Instance" },
      suffix: { cloudformationResourceType: "AWS::RDS::DBParameterGroup" }
    });
  },
  eventBusRule(stpResourceName, eventIndex) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: "Event",
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: "AWS::Events::Rule" }
    });
  },
  customTaggingScheduleRule() {
    return buildCfLogicalName({
      specifier: { type: "StpCustomTaggingSchedule" },
      suffix: { cloudformationResourceType: "AWS::Events::Rule" }
    });
  },
  customTaggingScheduleRulePermission() {
    return buildCfLogicalName({
      specifier: { type: "StpCustomTaggingScheduleRule" },
      suffix: { cloudformationResourceType: "AWS::Lambda::Permission" }
    });
  },
  cloudWatchLogEventSubscriptionFilter(stpResourceName, eventIndex) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: "Event",
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: "AWS::Logs::SubscriptionFilter" }
    });
  },
  eventSourceMapping(stpResourceName, eventIndex) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: "Event",
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: "AWS::Lambda::EventSourceMapping" }
    });
  },
  iotEventTopicRule(stpResourceName, eventIndex) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: "Event",
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: "AWS::IoT::TopicRule" }
    });
  },
  kinesisEventConsumer(stpResourceName, eventIndex) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: "Event",
        typeIndex: eventIndex
      },
      suffix: { cloudformationResourceType: "AWS::Kinesis::StreamConsumer" }
    });
  },
  lambda(stpResourceName, isStpServiceFunction) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: isStpServiceFunction ? { type: "CustomResource" } : undefined,
      suffix: { cloudformationResourceType: "AWS::Lambda::Function" }
    });
  },
  lambdaStpAlias(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: "Stp"
      },
      suffix: { cloudformationResourceType: "AWS::Lambda::Alias" }
    });
  },
  lambdaUrl(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Lambda::Url" }
    });
  },
  codeDeployDeploymentGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::CodeDeploy::DeploymentGroup" }
    });
  },
  customResource(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  scriptCustomResource(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Script" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  batchStateMachine(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "JobExecution" },
      suffix: { cloudformationResourceType: "AWS::StepFunctions::StateMachine" }
    });
  },
  batchJobDefinition(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Batch::JobDefinition" }
    });
  },
  batchJobLogGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Logs::LogGroup" }
    });
  },
  globalStateMachinesRole() {
    return buildCfLogicalName({
      specifier: {
        type: "GlobalStateMachine"
      },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  stateMachine(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::StepFunctions::StateMachine" }
    });
  },
  internetGateway() {
    return buildCfLogicalName({
      suffix: { cloudformationResourceType: "AWS::EC2::InternetGateway" }
    });
  },
  vpcGatewayAttachment() {
    return buildCfLogicalName({
      suffix: { cloudformationResourceType: "AWS::EC2::VPCGatewayAttachment" }
    });
  },
  routeTable(publicSubnet, subnetIndex) {
    return buildCfLogicalName({
      specifier: { type: publicSubnet ? "PublicSubnet" : "PrivateSubnet", typeIndex: subnetIndex },
      suffix: { cloudformationResourceType: "AWS::EC2::RouteTable" }
    });
  },
  internetGatewayRoute(subnetIndex) {
    return buildCfLogicalName({
      specifier: { type: "InternetGateway" },
      suffix: { cloudformationResourceType: "AWS::EC2::Route", index: subnetIndex }
    });
  },
  atlasMongoVpcRoute(publicSubnetTable, subnetIndex) {
    return buildCfLogicalName({
      specifier: { type: `AtlasMongo${publicSubnetTable ? "PublicSubnet" : "PrivateSubnet"}` },
      suffix: { cloudformationResourceType: "AWS::EC2::Route", index: subnetIndex }
    });
  },
  routeTableToSubnetAssociation(publicSubnet, subnetIndex) {
    return buildCfLogicalName({
      specifier: { type: publicSubnet ? "PublicSubnet" : "PrivateSubnet", typeIndex: subnetIndex },
      suffix: { cloudformationResourceType: "AWS::EC2::SubnetRouteTableAssociation" }
    });
  },
  natGateway(azIndex) {
    return buildCfLogicalName({
      suffix: { cloudformationResourceType: "AWS::EC2::NatGateway", index: azIndex }
    });
  },
  natElasticIp(azIndex) {
    return buildCfLogicalName({
      specifier: { type: "Nat" },
      suffix: { cloudformationResourceType: "AWS::EC2::EIP", index: azIndex }
    });
  },
  natRoute(subnetIndex) {
    return buildCfLogicalName({
      specifier: { type: "NatPrivateSubnet" },
      suffix: { cloudformationResourceType: "AWS::EC2::Route", index: subnetIndex }
    });
  },
  eventBus(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Events::EventBus" }
    });
  },
  eventBusArchive(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Events::Archive" }
    });
  },
  ecsCluster(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ECS::Cluster" }
    });
  },
  ecsTaskDefinition(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ECS::TaskDefinition" }
    });
  },
  ecsService(stpResourceName, blueGreen) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: blueGreen ? { type: "BlueGreen" } : undefined,
      suffix: { cloudformationResourceType: "AWS::ECS::Service" }
    });
  },
  ecsExecutionRole() {
    return buildCfLogicalName({
      specifier: { type: "EcsExecution" },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  ecsEc2InstanceRole() {
    return buildCfLogicalName({
      specifier: {
        type: "EcsInstance"
      },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  ecsEc2AutoscalingGroupWarmPool(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::AutoScaling::WarmPool" }
    });
  },
  eventBusRoleForScheduledInstanceRefresh() {
    return buildCfLogicalName({
      specifier: { type: "ScheduledInstanceRefresh" },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  schedulerRuleForScheduledInstanceRefresh(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "ScheduledInstanceRefresh" },
      suffix: { cloudformationResourceType: "AWS::Events::Rule" }
    });
  },
  ecsEc2InstanceLaunchTemplate(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::EC2::LaunchTemplate" }
    });
  },
  ecsEc2AutoscalingGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::AutoScaling::AutoScalingGroup" }
    });
  },
  ecsEc2ForceDeleteAutoscalingGroupCustomResource(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "ForceDeleteAsg" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  ecsDisableManagedTerminationProtectionCustomResource(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "DisableManagedTerminationProtection" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  ecsDeregisterTargetsCustomResource(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "DeregisterTargets" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  ecsEc2CapacityProvider(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ECS::CapacityProvider" }
    });
  },
  ecsEc2CapacityProviderAssociation(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ECS::ClusterCapacityProviderAssociations" }
    });
  },
  ecsEc2InstanceProfile() {
    return buildCfLogicalName({
      specifier: {
        type: "EcsInstance"
      },
      suffix: { cloudformationResourceType: "AWS::IAM::InstanceProfile" }
    });
  },
  ecsTaskRole(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  ecsAutoScalingRole() {
    return buildCfLogicalName({
      specifier: { type: "EcsAutoScale" },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  ecsScheduledMaintenanceLambdaPermission(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "ScheduledMaintenance" },
      suffix: { cloudformationResourceType: "AWS::Lambda::Permission" }
    }).replaceAll("_", "");
  },
  bastionEc2LaunchTemplate(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::EC2::LaunchTemplate" }
    });
  },
  bastionEc2InstanceProfile(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::IAM::InstanceProfile" }
    });
  },
  bastionEc2AutoscalingGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::AutoScaling::AutoScalingGroup" }
    });
  },
  bastionSecurityGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::EC2::SecurityGroup" }
    });
  },
  bastionCwAgentSsmAssociation(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "CwAgent" },
      suffix: { cloudformationResourceType: "AWS::SSM::Association" }
    });
  },
  bastionSsmAgentSsmAssociation(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "SsmAgent" },
      suffix: { cloudformationResourceType: "AWS::SSM::Association" }
    });
  },
  bastionRole(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  bastionLogGroup(stpResourceName, logType) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: pascalCase(logType) },
      suffix: { cloudformationResourceType: "AWS::Logs::LogGroup" }
    });
  },
  bastionCloudwatchSsmDocument() {
    return buildCfLogicalName({
      specifier: { type: "BastionCloudwatchAgent" },
      suffix: { cloudformationResourceType: "AWS::SSM::Document" }
    });
  },
  serviceDiscoveryEcsService(stpResourceName, serviceTargetContainerPort) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `Port${serviceTargetContainerPort}Discovery` },
      suffix: { cloudformationResourceType: "AWS::ServiceDiscovery::Service" }
    });
  },
  workloadSecurityGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::EC2::SecurityGroup" }
    });
  },
  loadBalancerSecurityGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Lb" },
      suffix: { cloudformationResourceType: "AWS::EC2::SecurityGroup" }
    });
  },
  targetGroup({
    loadBalancerName,
    stpResourceName,
    targetContainerPort,
    blueGreen
  }) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: {
        type: `${loadBalancerName}${targetContainerPort ? `ToPort${targetContainerPort}` : ""}${blueGreen ? "BG" : ""}`
      },
      suffix: { cloudformationResourceType: "AWS::ElasticLoadBalancingV2::TargetGroup" }
    });
  },
  lambdaRole(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  defaultLambdaFunctionRole() {
    return buildCfLogicalName({
      specifier: { type: "Lambda" },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  lambdaPermission(stpResourceName, eventIndex) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "Event", typeIndex: eventIndex },
      suffix: { cloudformationResourceType: "AWS::Lambda::Permission" }
    });
  },
  lambdaPublicUrlPermission(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "PublicUrl" },
      suffix: { cloudformationResourceType: "AWS::Lambda::Permission" }
    });
  },
  lambdaIotEventPermission(workloadName, eventIndex) {
    return pascalCase(`${workloadName}-Event${eventIndex}-lambda-iotEventPermission`);
  },
  lambdaTargetGroupPermission(stpResourceName, loadBalancerName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `${loadBalancerName}TargetGroup` },
      suffix: { cloudformationResourceType: "AWS::Lambda::Permission" }
    });
  },
  httpApi(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ApiGatewayV2::Api" }
    });
  },
  httpApiLogGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Logs::LogGroup" }
    });
  },
  httpApiLambdaIntegration({
    stpResourceName,
    stpHttpApiGatewayName
  }) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: stpHttpApiGatewayName },
      suffix: { cloudformationResourceType: "AWS::ApiGatewayV2::Integration" }
    });
  },
  httpApiContainerWorkloadIntegration({
    stpResourceName,
    stpHttpApiGatewayName,
    targetContainerPort
  }) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `${stpHttpApiGatewayName}ToPort${targetContainerPort}` },
      suffix: { cloudformationResourceType: "AWS::ApiGatewayV2::Integration" }
    });
  },
  httpApiAuthorizer({ method, path, stpResourceName }) {
    return buildCfLogicalName({
      stpResourceName: "",
      specifier: {
        type: `${stpResourceName}-${method === "*" ? "Any" : method}-${path === "*" ? "Default" : path}`
      },
      suffix: { cloudformationResourceType: "AWS::ApiGatewayV2::Authorizer" }
    });
  },
  httpApiRoute({ method, path, stpResourceName }) {
    return buildCfLogicalName({
      stpResourceName: "",
      specifier: {
        type: `${stpResourceName}-${method === "*" ? "Any" : method}-${path === "*" ? "Default" : path}`
      },
      suffix: { cloudformationResourceType: "AWS::ApiGatewayV2::Route" }
    });
  },
  httpApiVpcLink(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ApiGatewayV2::VpcLink" }
    });
  },
  httpApiVpcLinkSecurityGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "VpcLink" },
      suffix: { cloudformationResourceType: "AWS::EC2::SecurityGroup" }
    });
  },
  httpApiLambdaPermission({
    stpResourceNameOfLambda,
    stpResourceNameOfHttpApiGateway
  }) {
    return buildCfLogicalName({
      stpResourceName: stpResourceNameOfLambda,
      specifier: { type: stpResourceNameOfHttpApiGateway },
      suffix: { cloudformationResourceType: "AWS::Lambda::Permission" }
    });
  },
  httpApiStage(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ApiGatewayV2::Stage" }
    });
  },
  httpApiDomain(fullyQualifiedDomainName) {
    return buildCfLogicalName({
      stpResourceName: "",
      specifier: { type: getSpecifierForDomainResource(fullyQualifiedDomainName) },
      suffix: { cloudformationResourceType: "AWS::ApiGatewayV2::DomainName" }
    });
  },
  httpApiDefaultDomain(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ApiGatewayV2::DomainName" }
    });
  },
  httpApiDomainMapping(fullyQualifiedDomainName) {
    return buildCfLogicalName({
      stpResourceName: "",
      specifier: { type: getSpecifierForDomainResource(fullyQualifiedDomainName) },
      suffix: { cloudformationResourceType: "AWS::ApiGatewayV2::ApiMapping" }
    });
  },
  httpApiDefaultDomainMapping(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ApiGatewayV2::ApiMapping" }
    });
  },
  listener(exposurePort, stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `Port${exposurePort}` },
      suffix: { cloudformationResourceType: "AWS::ElasticLoadBalancingV2::Listener" }
    });
  },
  listenerRule(exposurePort, stpResourceName, rulePriority) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `Port${exposurePort}Priority${rulePriority}` },
      suffix: { cloudformationResourceType: "AWS::ElasticLoadBalancingV2::ListenerRule" }
    });
  },
  listenerCertificateList(exposurePort, stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `Port${exposurePort}` },
      suffix: { cloudformationResourceType: "AWS::ElasticLoadBalancingV2::ListenerCertificate" }
    });
  },
  loadBalancer(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ElasticLoadBalancingV2::LoadBalancer" }
    });
  },
  ecsLogGroup(stpResourceName, containerName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: containerName },
      suffix: { cloudformationResourceType: "AWS::Logs::LogGroup" }
    });
  },
  autoScalingTarget(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::ApplicationAutoScaling::ScalableTarget" }
    });
  },
  dynamoAutoScalingTarget(stpResourceName, metric) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: metric },
      suffix: { cloudformationResourceType: "AWS::ApplicationAutoScaling::ScalableTarget" }
    });
  },
  autoScalingPolicy(stpResourceName, metric) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: metric },
      suffix: { cloudformationResourceType: "AWS::ApplicationAutoScaling::ScalingPolicy" }
    });
  },
  customResourceS3Events() {
    return buildCfLogicalName({
      specifier: { type: "Events" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  customResourceSensitiveData() {
    return buildCfLogicalName({
      specifier: { type: "SensitiveData" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  customResourceAcceptVpcPeerings() {
    return buildCfLogicalName({
      specifier: { type: "AcceptVpcPeerings" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  customResourceDefaultDomainCert() {
    return buildCfLogicalName({
      specifier: { type: "DefaultDomainCert" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  customResourceEdgeLambdaBucket() {
    return buildCfLogicalName({
      specifier: { type: "EdgeLambdaBucket" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  customResourceEdgeLambda(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "EdgeLambda" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  customResourceDefaultDomain(stpResourceName, cdn) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: `${cdn ? "Cdn" : ""}DefaultDomain` },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  customResourceDatabaseDeletionProtection(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "DeletionProtection" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  userPool(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Cognito::UserPool" }
    });
  },
  userPoolClient(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Cognito::UserPoolClient" }
    });
  },
  userPoolDomain(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Cognito::UserPoolDomain" }
    });
  },
  identityProvider(stpResourceName, type) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type },
      suffix: { cloudformationResourceType: "AWS::Cognito::UserPoolIdentityProvider" }
    });
  },
  cognitoLambdaHookPermission(stpResourceName, hookName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: hookName },
      suffix: { cloudformationResourceType: "AWS::Lambda::Permission" }
    });
  },
  cognitoUserPoolDetailsCustomResource(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "UserPoolDetails" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  userPoolUiCustomizationAttachment(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Cognito::UserPoolUICustomizationAttachment" }
    });
  },
  serviceDiscoveryPrivateNamespace() {
    return buildCfLogicalName({
      specifier: { type: "Discovery" },
      suffix: { cloudformationResourceType: "AWS::ServiceDiscovery::Service" }
    });
  },
  lambdaCodeDeployApp() {
    return buildCfLogicalName({
      specifier: { type: "LambdaCodeDeploy" },
      suffix: { cloudformationResourceType: "AWS::CodeDeploy::Application" }
    });
  },
  sharedChunkLayer(layerNumber) {
    return buildCfLogicalName({
      specifier: { type: `SharedChunkLayer${layerNumber}` },
      suffix: { cloudformationResourceType: "AWS::Lambda::LayerVersion" }
    });
  },
  ecsCodeDeployApp() {
    return buildCfLogicalName({
      specifier: { type: "ECSCodeDeploy" },
      suffix: { cloudformationResourceType: "AWS::CodeDeploy::Application" }
    });
  },
  stackBudget(stackName) {
    return buildCfLogicalName({
      specifier: { type: pascalCase(stackName).replaceAll("_", "") },
      suffix: { cloudformationResourceType: "AWS::Budgets::Budget" }
    });
  },
  upstashRedisDatabase(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "Upstash::DatabasesV1::Database" }
    });
  },
  upstashCredentialsProvider() {
    return buildCfLogicalName({
      specifier: { type: "UpstashCredentialsProvider" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  cloudwatchAlarm(stacktapeAlarmName) {
    return buildCfLogicalName({
      stpResourceName: stacktapeAlarmName,
      suffix: { cloudformationResourceType: "AWS::CloudWatch::Alarm" }
    }).replaceAll("_", "");
  },
  cloudwatchAlarmEventBusNotificationRule(stacktapeAlarmName) {
    return buildCfLogicalName({
      stpResourceName: stacktapeAlarmName,
      specifier: { type: "Notification" },
      suffix: { cloudformationResourceType: "AWS::Events::Rule" }
    }).replaceAll("_", "");
  },
  cloudwatchAlarmEventBusNotificationRuleLambdaPermission(stacktapeAlarmName) {
    return buildCfLogicalName({
      stpResourceName: stacktapeAlarmName,
      specifier: { type: "Notification" },
      suffix: { cloudformationResourceType: "AWS::Lambda::Permission" }
    }).replaceAll("_", "");
  },
  cloudwatchAlarmSharedEventBusNotificationRuleLambdaPermission() {
    return buildCfLogicalName({
      specifier: { type: "CloudwatchAlarmNotificationShared" },
      suffix: { cloudformationResourceType: "AWS::Lambda::Permission" }
    }).replaceAll("_", "");
  },
  sqsQueue(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::SQS::Queue" }
    }).replaceAll("_", "");
  },
  sqsQueuePolicy(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::SQS::QueuePolicy" }
    });
  },
  snsTopic(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::SNS::Topic" }
    }).replaceAll("_", "");
  },
  kinesisStream(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::Kinesis::Stream" }
    });
  },
  webAppFirewallCustomResource(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "WebAppFirewall" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  webAppFirewallAssociation(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::WAFv2::WebACLAssociation" }
    });
  },
  openSearchDomain(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::OpenSearchService::Domain" }
    });
  },
  openSearchCustomResource(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "OpenSearch" },
      suffix: { cloudformationResourceType: "AWS::CloudFormation::CustomResource" }
    });
  },
  openSearchSecurityGroup(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::EC2::SecurityGroup" }
    });
  },
  logForwardingFirehoseToS3Role(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "LogForwardingS3" },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  logForwardingCwToFirehoseRole({ logGroupCfLogicalName }) {
    return buildCfLogicalName({
      stpResourceName: logGroupCfLogicalName,
      specifier: { type: "CwToFirehose" },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  logForwardingFailedEventsBucket(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "LogForwardingFailedRecords" },
      suffix: { cloudformationResourceType: "AWS::S3::Bucket" }
    });
  },
  logForwardingFirehoseDeliveryStream({ logGroupCfLogicalName }) {
    return buildCfLogicalName({
      stpResourceName: logGroupCfLogicalName,
      suffix: { cloudformationResourceType: "AWS::KinesisFirehose::DeliveryStream" }
    });
  },
  logForwardingSubscriptionFilter({ logGroupCfLogicalName }) {
    return buildCfLogicalName({
      stpResourceName: logGroupCfLogicalName,
      suffix: { cloudformationResourceType: "AWS::Logs::SubscriptionFilter" }
    });
  },
  issueDetectionSubscriptionFilter(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "IssueDetection" },
      suffix: { cloudformationResourceType: "AWS::Logs::SubscriptionFilter" }
    });
  },
  issueDetectionLogsPermission() {
    return buildCfLogicalName({
      specifier: { type: "IssueDetectionLogs" },
      suffix: { cloudformationResourceType: "AWS::Lambda::Permission" }
    });
  }
};
var buildCfLogicalName = ({
  stpResourceName,
  specifier,
  suffix
}) => {
  const splittedType = suffix.cloudformationResourceType.split(":");
  const resolvedParentName = stpResourceName || "Stp";
  const resolvedSpecifier = specifier ? `${specifier.type}${specifier.typeIndex !== undefined ? specifier.typeIndex : ""}${specifier.subtype !== undefined ? `-${specifier.subtype}` : ""}` : "";
  const resolvedSuffix = `${splittedType[splittedType.length - 1]}${suffix.index !== undefined ? suffix.index : ""}`;
  return pascalCase(`${resolvedParentName}-${resolvedSpecifier}-${resolvedSuffix}`);
};
var getSpecifierForDomainResource = (fullyQualifiedDomainName) => {
  if (pascalCase(fullyQualifiedDomainName).replace("_", "").length < 85) {
    return pascalCase(fullyQualifiedDomainName).replace("_", "");
  }
  const splittedDomain = fullyQualifiedDomainName.split(".").map((subdomain) => subdomain.split("-")).flat();
  const maxCharactersPerWord = Math.floor(85 / splittedDomain.length);
  return splittedDomain.map((word) => pascalCase(word.slice(0, maxCharactersPerWord)).replace("_", "")).join("");
};

// src/api/npm/ts/child-resources.ts
var CHILD_RESOURCES = {
  bucket: [
    { logicalName: cfLogicalNames.bucket, resourceType: "AWS::S3::Bucket" },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: "AWS::S3::BucketPolicy", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true }
  ],
  function: [
    { logicalName: cfLogicalNames.lambdaRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.lambda, resourceType: "AWS::Lambda::Function" },
    { logicalName: cfLogicalNames.efsAccessPoint, resourceType: "AWS::EFS::AccessPoint", conditional: true },
    { logicalName: cfLogicalNames.workloadSecurityGroup, resourceType: "AWS::EC2::SecurityGroup", conditional: true },
    { logicalName: cfLogicalNames.lambdaUrl, resourceType: "AWS::Lambda::Url", conditional: true },
    {
      logicalName: cfLogicalNames.lambdaPublicUrlPermission,
      resourceType: "AWS::Lambda::Permission",
      conditional: true
    },
    { logicalName: cfLogicalNames.lambdaLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    {
      logicalName: cfLogicalNames.lambdaInvokeConfig,
      resourceType: "AWS::Lambda::EventInvokeConfig",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.lambdaCodeDeployApp,
      resourceType: "AWS::CodeDeploy::Application",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.lambdaVersionPublisherCustomResource,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.codeDeployDeploymentGroup,
      resourceType: "AWS::CodeDeploy::DeploymentGroup",
      conditional: true
    },
    { logicalName: cfLogicalNames.lambdaStpAlias, resourceType: "AWS::Lambda::Alias", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true },
    {
      logicalName: cfLogicalNames.lambdaPermission,
      resourceType: "AWS::Lambda::Permission",
      conditional: true,
      unresolvable: true
    }
  ],
  "relational-database": [
    { logicalName: cfLogicalNames.dbSubnetGroup, resourceType: "AWS::RDS::DBSubnetGroup" },
    { logicalName: cfLogicalNames.dbSecurityGroup, resourceType: "AWS::EC2::SecurityGroup" },
    {
      logicalName: cfLogicalNames.customResourceDatabaseDeletionProtection,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.auroraDbCluster, resourceType: "AWS::RDS::DBCluster", conditional: true },
    {
      logicalName: cfLogicalNames.auroraDbClusterParameterGroup,
      resourceType: "AWS::RDS::DBClusterParameterGroup",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.auroraDbClusterLogGroup,
      resourceType: "AWS::Logs::LogGroup",
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.auroraDbInstance,
      resourceType: "AWS::RDS::DBInstance",
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.auroraDbInstanceParameterGroup,
      resourceType: "AWS::RDS::DBParameterGroup",
      conditional: true
    },
    { logicalName: cfLogicalNames.dbInstance, resourceType: "AWS::RDS::DBInstance", conditional: true },
    {
      logicalName: cfLogicalNames.dbInstanceLogGroup,
      resourceType: "AWS::Logs::LogGroup",
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.dbOptionGroup, resourceType: "AWS::RDS::OptionGroup", conditional: true },
    {
      logicalName: cfLogicalNames.dbInstanceParameterGroup,
      resourceType: "AWS::RDS::DBParameterGroup",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.dbReplica,
      resourceType: "AWS::RDS::DBInstance",
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.dbReplicaLogGroup,
      resourceType: "AWS::Logs::LogGroup",
      conditional: true,
      unresolvable: true
    }
  ],
  "dynamo-db-table": [{ logicalName: cfLogicalNames.dynamoGlobalTable, resourceType: "AWS::DynamoDB::GlobalTable" }],
  "http-api-gateway": [
    { logicalName: cfLogicalNames.httpApi, resourceType: "AWS::ApiGatewayV2::Api" },
    { logicalName: cfLogicalNames.httpApiStage, resourceType: "AWS::ApiGatewayV2::Stage" },
    { logicalName: cfLogicalNames.httpApiLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    {
      logicalName: cfLogicalNames.httpApiVpcLinkSecurityGroup,
      resourceType: "AWS::EC2::SecurityGroup",
      conditional: true
    },
    { logicalName: cfLogicalNames.httpApiVpcLink, resourceType: "AWS::ApiGatewayV2::VpcLink", conditional: true },
    { logicalName: cfLogicalNames.httpApiDomain, resourceType: "AWS::ApiGatewayV2::DomainName", conditional: true },
    {
      logicalName: cfLogicalNames.httpApiDomainMapping,
      resourceType: "AWS::ApiGatewayV2::ApiMapping",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.httpApiDefaultDomain,
      resourceType: "AWS::ApiGatewayV2::DomainName",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.httpApiDefaultDomainMapping,
      resourceType: "AWS::ApiGatewayV2::ApiMapping",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    }
  ],
  "batch-job": [
    { logicalName: cfLogicalNames.batchServiceRole, resourceType: "AWS::IAM::Role", conditional: true },
    { logicalName: cfLogicalNames.batchSpotFleetRole, resourceType: "AWS::IAM::Role", conditional: true },
    { logicalName: cfLogicalNames.batchInstanceRole, resourceType: "AWS::IAM::Role", conditional: true },
    { logicalName: cfLogicalNames.batchInstanceProfile, resourceType: "AWS::IAM::InstanceProfile", conditional: true },
    { logicalName: cfLogicalNames.batchStateMachineExecutionRole, resourceType: "AWS::IAM::Role", conditional: true },
    {
      logicalName: cfLogicalNames.batchInstanceLaunchTemplate,
      resourceType: "AWS::EC2::LaunchTemplate",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.batchInstanceDefaultSecurityGroup,
      resourceType: "AWS::EC2::SecurityGroup",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.batchComputeEnvironment,
      resourceType: "AWS::Batch::ComputeEnvironment",
      conditional: true
    },
    { logicalName: cfLogicalNames.batchJobQueue, resourceType: "AWS::Batch::JobQueue", conditional: true },
    { logicalName: cfLogicalNames.batchJobDefinition, resourceType: "AWS::Batch::JobDefinition" },
    { logicalName: cfLogicalNames.batchStateMachine, resourceType: "AWS::StepFunctions::StateMachine" },
    { logicalName: cfLogicalNames.batchJobLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    { logicalName: cfLogicalNames.batchJobExecutionRole, resourceType: "AWS::IAM::Role" },
    {
      logicalName: cfLogicalNames.atlasMongoUserAssociatedWithRole,
      resourceType: "MongoDB::StpAtlasV1::DatabaseUser",
      conditional: true
    }
  ],
  "event-bus": [
    { logicalName: cfLogicalNames.eventBus, resourceType: "AWS::Events::EventBus" },
    { logicalName: cfLogicalNames.eventBusArchive, resourceType: "AWS::Events::Archive", conditional: true }
  ],
  "state-machine": [
    { logicalName: cfLogicalNames.globalStateMachinesRole, resourceType: "AWS::IAM::Role", conditional: true },
    { logicalName: cfLogicalNames.stateMachine, resourceType: "AWS::StepFunctions::StateMachine" }
  ],
  "redis-cluster": [
    { logicalName: cfLogicalNames.redisParameterGroup, resourceType: "AWS::ElastiCache::ParameterGroup" },
    { logicalName: cfLogicalNames.redisSubnetGroup, resourceType: "AWS::ElastiCache::SubnetGroup" },
    { logicalName: cfLogicalNames.redisSecurityGroup, resourceType: "AWS::EC2::SecurityGroup" },
    { logicalName: cfLogicalNames.redisLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    { logicalName: cfLogicalNames.redisReplicationGroup, resourceType: "AWS::ElastiCache::ReplicationGroup" }
  ],
  "mongo-db-atlas-cluster": [
    {
      logicalName: cfLogicalNames.atlasMongoCredentialsProvider,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.atlasMongoProject, resourceType: "MongoDB::StpAtlasV1::Project", conditional: true },
    {
      logicalName: cfLogicalNames.atlasMongoProjectIpAccessList,
      resourceType: "MongoDB::StpAtlasV1::ProjectIpAccessList",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.atlasMongoProjectVpcNetworkContainer,
      resourceType: "MongoDB::StpAtlasV1::NetworkContainer",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.atlasMongoProjectVpcNetworkPeering,
      resourceType: "MongoDB::StpAtlasV1::NetworkPeering",
      conditional: true
    },
    { logicalName: cfLogicalNames.atlasMongoVpcRoute, resourceType: "AWS::EC2::Route", conditional: true },
    { logicalName: cfLogicalNames.atlasMongoCluster, resourceType: "MongoDB::StpAtlasV1::Cluster" },
    {
      logicalName: cfLogicalNames.atlasMongoClusterMasterUser,
      resourceType: "MongoDB::StpAtlasV1::DatabaseUser",
      conditional: true
    }
  ],
  "user-auth-pool": [
    { logicalName: cfLogicalNames.userPool, resourceType: "AWS::Cognito::UserPool" },
    { logicalName: cfLogicalNames.snsRoleSendSmsFromCognito, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.userPoolClient, resourceType: "AWS::Cognito::UserPoolClient" },
    { logicalName: cfLogicalNames.userPoolDomain, resourceType: "AWS::Cognito::UserPoolDomain" },
    {
      logicalName: cfLogicalNames.cognitoUserPoolDetailsCustomResource,
      resourceType: "AWS::CloudFormation::CustomResource"
    },
    {
      logicalName: cfLogicalNames.identityProvider,
      resourceType: "AWS::Cognito::UserPoolIdentityProvider",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cognitoLambdaHookPermission,
      resourceType: "AWS::Lambda::Permission",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.userPoolUiCustomizationAttachment,
      resourceType: "AWS::Cognito::UserPoolUICustomizationAttachment",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.webAppFirewallAssociation,
      resourceType: "AWS::WAFv2::WebACLAssociation",
      conditional: true
    }
  ],
  "upstash-redis": [
    {
      logicalName: cfLogicalNames.upstashCredentialsProvider,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.upstashRedisDatabase, resourceType: "Upstash::Redis::Database" }
  ],
  "application-load-balancer": [
    { logicalName: cfLogicalNames.loadBalancer, resourceType: "AWS::ElasticLoadBalancingV2::LoadBalancer" },
    { logicalName: cfLogicalNames.loadBalancerSecurityGroup, resourceType: "AWS::EC2::SecurityGroup" },
    {
      logicalName: cfLogicalNames.webAppFirewallAssociation,
      resourceType: "AWS::WAFv2::WebACLAssociation",
      conditional: true
    },
    { logicalName: cfLogicalNames.listener, resourceType: "AWS::ElasticLoadBalancingV2::Listener", conditional: true },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    }
  ],
  "network-load-balancer": [
    { logicalName: cfLogicalNames.loadBalancer, resourceType: "AWS::ElasticLoadBalancingV2::LoadBalancer" },
    { logicalName: cfLogicalNames.loadBalancerSecurityGroup, resourceType: "AWS::EC2::SecurityGroup" },
    { logicalName: cfLogicalNames.listener, resourceType: "AWS::ElasticLoadBalancingV2::Listener", conditional: true },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true }
  ],
  "hosting-bucket": [
    { logicalName: cfLogicalNames.bucket, resourceType: "AWS::S3::Bucket" },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: "AWS::S3::BucketPolicy", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true }
  ],
  "web-app-firewall": [
    { logicalName: cfLogicalNames.webAppFirewallCustomResource, resourceType: "AWS::CloudFormation::CustomResource" }
  ],
  "open-search-domain": [
    { logicalName: cfLogicalNames.openSearchDomain, resourceType: "AWS::OpenSearchService::Domain" },
    { logicalName: cfLogicalNames.openSearchSecurityGroup, resourceType: "AWS::EC2::SecurityGroup", conditional: true },
    {
      logicalName: cfLogicalNames.openSearchDomainLogGroup,
      resourceType: "AWS::Logs::LogGroup",
      conditional: true,
      unresolvable: true
    },
    {
      logicalName: cfLogicalNames.openSearchCustomResource,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    }
  ],
  "efs-filesystem": [
    { logicalName: cfLogicalNames.efsFilesystem, resourceType: "AWS::EFS::FileSystem" },
    { logicalName: cfLogicalNames.efsSecurityGroup, resourceType: "AWS::EC2::SecurityGroup" },
    {
      logicalName: cfLogicalNames.efsMountTarget,
      resourceType: "AWS::EFS::MountTarget",
      unresolvable: true
    }
  ],
  "nextjs-web": [
    {
      logicalName: cfLogicalNames.openNextHostHeaderRewriteFunction,
      resourceType: "AWS::CloudFront::Function"
    },
    {
      logicalName: cfLogicalNames.openNextAssetReplacerCustomResource,
      resourceType: "AWS::CloudFormation::CustomResource"
    },
    {
      logicalName: cfLogicalNames.openNextDynamoInsertCustomResource,
      resourceType: "AWS::CloudFormation::CustomResource"
    },
    { logicalName: cfLogicalNames.bucket, resourceType: "AWS::S3::Bucket" },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: "AWS::S3::BucketPolicy", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true },
    { logicalName: cfLogicalNames.lambdaRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.lambda, resourceType: "AWS::Lambda::Function" },
    { logicalName: cfLogicalNames.lambdaLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    { logicalName: cfLogicalNames.lambdaUrl, resourceType: "AWS::Lambda::Url", conditional: true },
    {
      logicalName: cfLogicalNames.customResourceEdgeLambda,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.sqsQueue, resourceType: "AWS::SQS::Queue" },
    { logicalName: cfLogicalNames.sqsQueuePolicy, resourceType: "AWS::SQS::QueuePolicy", conditional: true },
    { logicalName: cfLogicalNames.dynamoGlobalTable, resourceType: "AWS::DynamoDB::GlobalTable" }
  ],
  "multi-container-workload": [
    { logicalName: cfLogicalNames.ecsExecutionRole, resourceType: "AWS::IAM::Role", conditional: true },
    { logicalName: cfLogicalNames.ecsAutoScalingRole, resourceType: "AWS::IAM::Role", conditional: true },
    {
      logicalName: cfLogicalNames.autoScalingTarget,
      resourceType: "AWS::ApplicationAutoScaling::ScalableTarget",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.autoScalingPolicy,
      resourceType: "AWS::ApplicationAutoScaling::ScalingPolicy",
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceRole, resourceType: "AWS::IAM::Role", conditional: true },
    {
      logicalName: cfLogicalNames.eventBusRoleForScheduledInstanceRefresh,
      resourceType: "AWS::IAM::Role",
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceProfile, resourceType: "AWS::IAM::InstanceProfile", conditional: true },
    {
      logicalName: cfLogicalNames.ecsEc2InstanceLaunchTemplate,
      resourceType: "AWS::EC2::LaunchTemplate",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroup,
      resourceType: "AWS::AutoScaling::AutoScalingGroup",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProvider,
      resourceType: "AWS::ECS::CapacityProvider",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProviderAssociation,
      resourceType: "AWS::ECS::ClusterCapacityProviderAssociations",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.schedulerRuleForScheduledInstanceRefresh,
      resourceType: "AWS::Scheduler::Schedule",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroupWarmPool,
      resourceType: "AWS::AutoScaling::WarmPool",
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsCodeDeployApp, resourceType: "AWS::CodeDeploy::Application", conditional: true },
    {
      logicalName: cfLogicalNames.codeDeployDeploymentGroup,
      resourceType: "AWS::CodeDeploy::DeploymentGroup",
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsCluster, resourceType: "AWS::ECS::Cluster" },
    { logicalName: cfLogicalNames.workloadSecurityGroup, resourceType: "AWS::EC2::SecurityGroup" },
    {
      logicalName: cfLogicalNames.ecsService,
      resourceType: "AWS::ECS::Service",
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsTaskRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.ecsTaskDefinition, resourceType: "AWS::ECS::TaskDefinition" },
    {
      logicalName: cfLogicalNames.ecsLogGroup,
      resourceType: "AWS::Logs::LogGroup",
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.efsAccessPoint, resourceType: "AWS::EFS::AccessPoint", conditional: true },
    {
      logicalName: cfLogicalNames.atlasMongoUserAssociatedWithRole,
      resourceType: "MongoDB::StpAtlasV1::DatabaseUser",
      conditional: true
    }
  ],
  "sqs-queue": [
    { logicalName: cfLogicalNames.sqsQueue, resourceType: "AWS::SQS::Queue" },
    { logicalName: cfLogicalNames.sqsQueuePolicy, resourceType: "AWS::SQS::QueuePolicy", conditional: true }
  ],
  "sns-topic": [{ logicalName: cfLogicalNames.snsTopic, resourceType: "AWS::SNS::Topic" }],
  "kinesis-stream": [{ logicalName: cfLogicalNames.kinesisStream, resourceType: "AWS::Kinesis::Stream" }],
  bastion: [
    {
      logicalName: cfLogicalNames.bastionCloudwatchSsmDocument,
      resourceType: "AWS::SSM::Document",
      conditional: true
    },
    { logicalName: cfLogicalNames.bastionEc2AutoscalingGroup, resourceType: "AWS::AutoScaling::AutoScalingGroup" },
    { logicalName: cfLogicalNames.bastionSecurityGroup, resourceType: "AWS::EC2::SecurityGroup" },
    { logicalName: cfLogicalNames.bastionEc2LaunchTemplate, resourceType: "AWS::EC2::LaunchTemplate" },
    { logicalName: cfLogicalNames.bastionRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.bastionEc2InstanceProfile, resourceType: "AWS::IAM::InstanceProfile" },
    { logicalName: cfLogicalNames.bastionCwAgentSsmAssociation, resourceType: "AWS::SSM::Association" },
    { logicalName: cfLogicalNames.bastionSsmAgentSsmAssociation, resourceType: "AWS::SSM::Association" },
    {
      logicalName: cfLogicalNames.bastionLogGroup,
      resourceType: "AWS::Logs::LogGroup",
      conditional: true,
      unresolvable: true
    }
  ],
  "edge-lambda-function": [
    { logicalName: cfLogicalNames.customResourceEdgeLambda, resourceType: "AWS::CloudFormation::CustomResource" }
  ],
  "web-service": [
    { logicalName: cfLogicalNames.ecsCluster, resourceType: "AWS::ECS::Cluster" },
    { logicalName: cfLogicalNames.workloadSecurityGroup, resourceType: "AWS::EC2::SecurityGroup" },
    {
      logicalName: cfLogicalNames.ecsService,
      resourceType: "AWS::ECS::Service",
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsTaskRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.ecsTaskDefinition, resourceType: "AWS::ECS::TaskDefinition" },
    { logicalName: cfLogicalNames.ecsExecutionRole, resourceType: "AWS::IAM::Role", conditional: true },
    { logicalName: cfLogicalNames.ecsAutoScalingRole, resourceType: "AWS::IAM::Role", conditional: true },
    {
      logicalName: cfLogicalNames.autoScalingTarget,
      resourceType: "AWS::ApplicationAutoScaling::ScalableTarget",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.autoScalingPolicy,
      resourceType: "AWS::ApplicationAutoScaling::ScalingPolicy",
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceRole, resourceType: "AWS::IAM::Role", conditional: true },
    {
      logicalName: cfLogicalNames.eventBusRoleForScheduledInstanceRefresh,
      resourceType: "AWS::IAM::Role",
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceProfile, resourceType: "AWS::IAM::InstanceProfile", conditional: true },
    {
      logicalName: cfLogicalNames.ecsEc2InstanceLaunchTemplate,
      resourceType: "AWS::EC2::LaunchTemplate",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroup,
      resourceType: "AWS::AutoScaling::AutoScalingGroup",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProvider,
      resourceType: "AWS::ECS::CapacityProvider",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProviderAssociation,
      resourceType: "AWS::ECS::ClusterCapacityProviderAssociations",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.schedulerRuleForScheduledInstanceRefresh,
      resourceType: "AWS::Scheduler::Schedule",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroupWarmPool,
      resourceType: "AWS::AutoScaling::WarmPool",
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsCodeDeployApp, resourceType: "AWS::CodeDeploy::Application", conditional: true },
    {
      logicalName: cfLogicalNames.codeDeployDeploymentGroup,
      resourceType: "AWS::CodeDeploy::DeploymentGroup",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsLogGroup,
      resourceType: "AWS::Logs::LogGroup",
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.efsAccessPoint, resourceType: "AWS::EFS::AccessPoint", conditional: true },
    {
      logicalName: cfLogicalNames.loadBalancer,
      resourceType: "AWS::ElasticLoadBalancingV2::LoadBalancer",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.loadBalancerSecurityGroup,
      resourceType: "AWS::EC2::SecurityGroup",
      conditional: true
    },
    { logicalName: cfLogicalNames.listener, resourceType: "AWS::ElasticLoadBalancingV2::Listener", conditional: true },
    {
      logicalName: cfLogicalNames.webAppFirewallAssociation,
      resourceType: "AWS::WAFv2::WebACLAssociation",
      conditional: true
    },
    { logicalName: cfLogicalNames.httpApi, resourceType: "AWS::ApiGatewayV2::Api", conditional: true },
    { logicalName: cfLogicalNames.httpApiStage, resourceType: "AWS::ApiGatewayV2::Stage", conditional: true },
    { logicalName: cfLogicalNames.httpApiLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    {
      logicalName: cfLogicalNames.httpApiVpcLinkSecurityGroup,
      resourceType: "AWS::EC2::SecurityGroup",
      conditional: true
    },
    { logicalName: cfLogicalNames.httpApiVpcLink, resourceType: "AWS::ApiGatewayV2::VpcLink", conditional: true },
    { logicalName: cfLogicalNames.httpApiDomain, resourceType: "AWS::ApiGatewayV2::DomainName", conditional: true },
    {
      logicalName: cfLogicalNames.httpApiDomainMapping,
      resourceType: "AWS::ApiGatewayV2::ApiMapping",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.httpApiDefaultDomain,
      resourceType: "AWS::ApiGatewayV2::DomainName",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.httpApiDefaultDomainMapping,
      resourceType: "AWS::ApiGatewayV2::ApiMapping",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    }
  ],
  "private-service": [
    { logicalName: cfLogicalNames.ecsCluster, resourceType: "AWS::ECS::Cluster" },
    { logicalName: cfLogicalNames.workloadSecurityGroup, resourceType: "AWS::EC2::SecurityGroup" },
    {
      logicalName: cfLogicalNames.ecsService,
      resourceType: "AWS::ECS::Service",
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsTaskRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.ecsTaskDefinition, resourceType: "AWS::ECS::TaskDefinition" },
    { logicalName: cfLogicalNames.ecsExecutionRole, resourceType: "AWS::IAM::Role", conditional: true },
    { logicalName: cfLogicalNames.ecsAutoScalingRole, resourceType: "AWS::IAM::Role", conditional: true },
    {
      logicalName: cfLogicalNames.autoScalingTarget,
      resourceType: "AWS::ApplicationAutoScaling::ScalableTarget",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.autoScalingPolicy,
      resourceType: "AWS::ApplicationAutoScaling::ScalingPolicy",
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceRole, resourceType: "AWS::IAM::Role", conditional: true },
    {
      logicalName: cfLogicalNames.eventBusRoleForScheduledInstanceRefresh,
      resourceType: "AWS::IAM::Role",
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceProfile, resourceType: "AWS::IAM::InstanceProfile", conditional: true },
    {
      logicalName: cfLogicalNames.ecsEc2InstanceLaunchTemplate,
      resourceType: "AWS::EC2::LaunchTemplate",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroup,
      resourceType: "AWS::AutoScaling::AutoScalingGroup",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProvider,
      resourceType: "AWS::ECS::CapacityProvider",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProviderAssociation,
      resourceType: "AWS::ECS::ClusterCapacityProviderAssociations",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.schedulerRuleForScheduledInstanceRefresh,
      resourceType: "AWS::Scheduler::Schedule",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroupWarmPool,
      resourceType: "AWS::AutoScaling::WarmPool",
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsCodeDeployApp, resourceType: "AWS::CodeDeploy::Application", conditional: true },
    {
      logicalName: cfLogicalNames.codeDeployDeploymentGroup,
      resourceType: "AWS::CodeDeploy::DeploymentGroup",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsLogGroup,
      resourceType: "AWS::Logs::LogGroup",
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.efsAccessPoint, resourceType: "AWS::EFS::AccessPoint", conditional: true },
    {
      logicalName: cfLogicalNames.loadBalancer,
      resourceType: "AWS::ElasticLoadBalancingV2::LoadBalancer",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.loadBalancerSecurityGroup,
      resourceType: "AWS::EC2::SecurityGroup",
      conditional: true
    },
    { logicalName: cfLogicalNames.listener, resourceType: "AWS::ElasticLoadBalancingV2::Listener", conditional: true },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true }
  ],
  "worker-service": [
    { logicalName: cfLogicalNames.ecsCluster, resourceType: "AWS::ECS::Cluster" },
    { logicalName: cfLogicalNames.workloadSecurityGroup, resourceType: "AWS::EC2::SecurityGroup" },
    {
      logicalName: cfLogicalNames.ecsService,
      resourceType: "AWS::ECS::Service",
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsTaskRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.ecsTaskDefinition, resourceType: "AWS::ECS::TaskDefinition" },
    { logicalName: cfLogicalNames.ecsExecutionRole, resourceType: "AWS::IAM::Role", conditional: true },
    { logicalName: cfLogicalNames.ecsAutoScalingRole, resourceType: "AWS::IAM::Role", conditional: true },
    {
      logicalName: cfLogicalNames.autoScalingTarget,
      resourceType: "AWS::ApplicationAutoScaling::ScalableTarget",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.autoScalingPolicy,
      resourceType: "AWS::ApplicationAutoScaling::ScalingPolicy",
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceRole, resourceType: "AWS::IAM::Role", conditional: true },
    {
      logicalName: cfLogicalNames.eventBusRoleForScheduledInstanceRefresh,
      resourceType: "AWS::IAM::Role",
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsEc2InstanceProfile, resourceType: "AWS::IAM::InstanceProfile", conditional: true },
    {
      logicalName: cfLogicalNames.ecsEc2InstanceLaunchTemplate,
      resourceType: "AWS::EC2::LaunchTemplate",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroup,
      resourceType: "AWS::AutoScaling::AutoScalingGroup",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2ForceDeleteAutoscalingGroupCustomResource,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProvider,
      resourceType: "AWS::ECS::CapacityProvider",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2CapacityProviderAssociation,
      resourceType: "AWS::ECS::ClusterCapacityProviderAssociations",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.schedulerRuleForScheduledInstanceRefresh,
      resourceType: "AWS::Scheduler::Schedule",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsEc2AutoscalingGroupWarmPool,
      resourceType: "AWS::AutoScaling::WarmPool",
      conditional: true
    },
    { logicalName: cfLogicalNames.ecsCodeDeployApp, resourceType: "AWS::CodeDeploy::Application", conditional: true },
    {
      logicalName: cfLogicalNames.codeDeployDeploymentGroup,
      resourceType: "AWS::CodeDeploy::DeploymentGroup",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.ecsLogGroup,
      resourceType: "AWS::Logs::LogGroup",
      conditional: true,
      unresolvable: true
    },
    { logicalName: cfLogicalNames.efsAccessPoint, resourceType: "AWS::EFS::AccessPoint", conditional: true },
    {
      logicalName: cfLogicalNames.atlasMongoUserAssociatedWithRole,
      resourceType: "MongoDB::StpAtlasV1::DatabaseUser",
      conditional: true
    }
  ],
  "astro-web": [
    { logicalName: cfLogicalNames.ssrWebHostHeaderRewriteFunction, resourceType: "AWS::CloudFront::Function" },
    { logicalName: cfLogicalNames.bucket, resourceType: "AWS::S3::Bucket" },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: "AWS::S3::BucketPolicy", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true },
    { logicalName: cfLogicalNames.lambdaRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.lambda, resourceType: "AWS::Lambda::Function" },
    { logicalName: cfLogicalNames.lambdaLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    { logicalName: cfLogicalNames.lambdaUrl, resourceType: "AWS::Lambda::Url", conditional: true }
  ],
  "nuxt-web": [
    { logicalName: cfLogicalNames.ssrWebHostHeaderRewriteFunction, resourceType: "AWS::CloudFront::Function" },
    { logicalName: cfLogicalNames.bucket, resourceType: "AWS::S3::Bucket" },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: "AWS::S3::BucketPolicy", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true },
    { logicalName: cfLogicalNames.lambdaRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.lambda, resourceType: "AWS::Lambda::Function" },
    { logicalName: cfLogicalNames.lambdaLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    { logicalName: cfLogicalNames.lambdaUrl, resourceType: "AWS::Lambda::Url", conditional: true }
  ],
  "sveltekit-web": [
    { logicalName: cfLogicalNames.ssrWebHostHeaderRewriteFunction, resourceType: "AWS::CloudFront::Function" },
    { logicalName: cfLogicalNames.bucket, resourceType: "AWS::S3::Bucket" },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: "AWS::S3::BucketPolicy", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true },
    { logicalName: cfLogicalNames.lambdaRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.lambda, resourceType: "AWS::Lambda::Function" },
    { logicalName: cfLogicalNames.lambdaLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    { logicalName: cfLogicalNames.lambdaUrl, resourceType: "AWS::Lambda::Url", conditional: true }
  ],
  "solidstart-web": [
    { logicalName: cfLogicalNames.ssrWebHostHeaderRewriteFunction, resourceType: "AWS::CloudFront::Function" },
    { logicalName: cfLogicalNames.bucket, resourceType: "AWS::S3::Bucket" },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: "AWS::S3::BucketPolicy", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true },
    { logicalName: cfLogicalNames.lambdaRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.lambda, resourceType: "AWS::Lambda::Function" },
    { logicalName: cfLogicalNames.lambdaLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    { logicalName: cfLogicalNames.lambdaUrl, resourceType: "AWS::Lambda::Url", conditional: true }
  ],
  "tanstack-web": [
    { logicalName: cfLogicalNames.ssrWebHostHeaderRewriteFunction, resourceType: "AWS::CloudFront::Function" },
    { logicalName: cfLogicalNames.bucket, resourceType: "AWS::S3::Bucket" },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: "AWS::S3::BucketPolicy", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true },
    { logicalName: cfLogicalNames.lambdaRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.lambda, resourceType: "AWS::Lambda::Function" },
    { logicalName: cfLogicalNames.lambdaLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    { logicalName: cfLogicalNames.lambdaUrl, resourceType: "AWS::Lambda::Url", conditional: true }
  ],
  "remix-web": [
    { logicalName: cfLogicalNames.ssrWebHostHeaderRewriteFunction, resourceType: "AWS::CloudFront::Function" },
    { logicalName: cfLogicalNames.bucket, resourceType: "AWS::S3::Bucket" },
    { logicalName: cfLogicalNames.bucketPolicy, resourceType: "AWS::S3::BucketPolicy", conditional: true },
    {
      logicalName: cfLogicalNames.cloudfrontOriginAccessIdentity,
      resourceType: "AWS::CloudFront::CloudFrontOriginAccessIdentity",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultCachePolicy,
      resourceType: "AWS::CloudFront::CachePolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontCustomOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy,
      resourceType: "AWS::CloudFront::OriginRequestPolicy",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.cloudfrontDistribution,
      resourceType: "AWS::CloudFront::Distribution",
      conditional: true
    },
    {
      logicalName: cfLogicalNames.customResourceDefaultDomain,
      resourceType: "AWS::CloudFormation::CustomResource",
      conditional: true
    },
    { logicalName: cfLogicalNames.dnsRecord, resourceType: "AWS::Route53::RecordSet", conditional: true },
    { logicalName: cfLogicalNames.lambdaRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.lambda, resourceType: "AWS::Lambda::Function" },
    { logicalName: cfLogicalNames.lambdaLogGroup, resourceType: "AWS::Logs::LogGroup", conditional: true },
    { logicalName: cfLogicalNames.lambdaUrl, resourceType: "AWS::Lambda::Url", conditional: true }
  ],
  convex: [],
  "custom-resource-instance": [],
  "custom-resource-definition": [],
  "deployment-script": [],
  "aws-cdk-construct": []
};

// src/api/npm/ts/config.ts
var getParamReferenceSymbol = Symbol.for("stacktape:getParamReference");
var getTypeSymbol = Symbol.for("stacktape:getType");
var getPropertiesSymbol = Symbol.for("stacktape:getProperties");
var getOverridesSymbol = Symbol.for("stacktape:getOverrides");
var getTransformsSymbol = Symbol.for("stacktape:getTransforms");
var setResourceNameSymbol = Symbol.for("stacktape:setResourceName");
var resourceParamRefSymbol = Symbol.for("stacktape:isResourceParamRef");
var baseTypePropertiesSymbol = Symbol.for("stacktape:isBaseTypeProperties");
var alarmSymbol = Symbol.for("stacktape:isAlarm");
var isBaseResource = (value) => value !== null && typeof value === "object" && (setResourceNameSymbol in value);
var isBaseTypeProperties = (value) => value !== null && typeof value === "object" && (baseTypePropertiesSymbol in value);
var isAlarm = (value) => value !== null && typeof value === "object" && (alarmSymbol in value);
var isResourceParamReference = (value) => value !== null && typeof value === "object" && (resourceParamRefSymbol in value);
var deferredNameSymbol = Symbol.for("stacktape:isDeferredResourceName");
var isDeferredResourceName = (value) => value !== null && typeof value === "object" && (deferredNameSymbol in value);

class DeferredResourceName {
  __resource;
  [deferredNameSymbol] = true;
  constructor(resource) {
    this.__resource = resource;
  }
  resolve() {
    const name = this.__resource._resourceName;
    if (name === undefined) {
      throw new Error("Resource name not set. Make sure to add the resource to the resources object in your config. " + "The resource name is automatically derived from the object key.");
    }
    return name;
  }
  toString() {
    return this.resolve();
  }
  toJSON() {
    return this.resolve();
  }
  valueOf() {
    return this.resolve();
  }
}

class ResourceParamReference {
  __resource;
  __param;
  [resourceParamRefSymbol] = true;
  constructor(resource, param) {
    this.__resource = resource;
    this.__param = param;
  }
  toString() {
    return `$ResourceParam('${this.__resource.resourceName}', '${this.__param}')`;
  }
  toJSON() {
    return this.toString();
  }
  valueOf() {
    return this.toString();
  }
}

class BaseTypeProperties {
  type;
  properties;
  [baseTypePropertiesSymbol] = true;
  constructor(type, properties) {
    this.type = type;
    this.properties = properties;
  }
}

class BaseTypeOnly {
  type;
  [baseTypePropertiesSymbol] = true;
  constructor(type) {
    this.type = type;
  }
}

class Alarm {
  [alarmSymbol] = true;
  trigger;
  evaluation;
  notificationTargets;
  description;
  constructor(props) {
    this.trigger = props.trigger;
    this.evaluation = props.evaluation;
    this.notificationTargets = props.notificationTargets;
    this.description = props.description;
  }
}

class BaseResource {
  _type;
  _properties;
  _overrides;
  _transforms;
  _resourceName;
  _explicitName;
  constructor(name, type, properties, overrides) {
    this._resourceName = name;
    this._explicitName = name !== undefined;
    this._type = type;
    this._properties = properties;
    this._overrides = overrides;
    if (name !== undefined) {
      this._processOverridesAndTransforms();
    }
  }
  _processOverridesAndTransforms() {
    const properties = this._properties;
    if (properties && typeof properties === "object") {
      const finalProperties = { ...properties };
      if ("overrides" in finalProperties) {
        const propertiesOverrides = finalProperties.overrides;
        delete finalProperties.overrides;
        if (propertiesOverrides && typeof propertiesOverrides === "object") {
          this._overrides = transformOverridesToLogicalNames(this._resourceName, this._type, propertiesOverrides);
        }
      }
      if ("transforms" in finalProperties) {
        const propertiesTransforms = finalProperties.transforms;
        delete finalProperties.transforms;
        if (propertiesTransforms && typeof propertiesTransforms === "object") {
          this._transforms = transformTransformsToLogicalNames(this._resourceName, this._type, propertiesTransforms);
        }
      }
      this._properties = finalProperties;
    }
    if (this._overrides && typeof this._overrides === "object") {
      this._overrides = transformOverridesToLogicalNames(this._resourceName, this._type, this._overrides);
    }
    if (this._transforms && typeof this._transforms === "object") {
      this._transforms = transformTransformsToLogicalNames(this._resourceName, this._type, this._transforms);
    }
  }
  get resourceName() {
    if (this._resourceName === undefined) {
      return new DeferredResourceName(this);
    }
    return this._resourceName;
  }
  [setResourceNameSymbol](name) {
    if (this._explicitName && this._resourceName !== name) {
      return;
    }
    if (this._resourceName === undefined) {
      this._resourceName = name;
      this._processOverridesAndTransforms();
    }
  }
  [getParamReferenceSymbol](paramName) {
    return new ResourceParamReference(this, paramName);
  }
  [getTypeSymbol]() {
    return this._type;
  }
  [getPropertiesSymbol]() {
    return this._properties;
  }
  [getOverridesSymbol]() {
    return this._overrides;
  }
  [getTransformsSymbol]() {
    return this._transforms;
  }
}
function flattenToDotNotation(obj, prefix = "") {
  const result = {};
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value) && value.constructor === Object) {
      if (Object.keys(value).some((childKey) => !/^[A-Za-z0-9_]+$/.test(childKey))) {
        result[newKey] = value;
        continue;
      }
      Object.assign(result, flattenToDotNotation(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}
function transformOverridesToLogicalNames(resourceName, resourceType, overrides) {
  const childResources = CHILD_RESOURCES[resourceType] || [];
  const propertyNameMap = new Map;
  for (const childResource of childResources) {
    if (childResource.logicalName && childResource.logicalName.name) {
      propertyNameMap.set(childResource.logicalName.name, childResource);
    }
  }
  const transformedOverrides = {};
  const errorMessage = `Override of property {propertyName} of resource ${resourceName} is not supported.

Remove the override, run 'stacktape compile:template' command, and find the logical name of the resource you want to override manually. Then add it to the overrides object.`;
  for (const propertyName in overrides) {
    const childResource = propertyNameMap.get(propertyName);
    if (childResource?.unresolvable) {
      throw new Error(errorMessage.replace("{propertyName}", propertyName));
    }
    if (childResource) {
      const logicalNameFn = childResource.logicalName;
      let logicalName;
      try {
        logicalName = logicalNameFn(resourceName);
      } catch {
        try {
          logicalName = logicalNameFn();
        } catch {
          logicalName = propertyName;
        }
      }
      if (logicalName.includes("undefined")) {
        throw new Error(errorMessage.replace("{propertyName}", propertyName));
      }
      const overrideValue = overrides[propertyName];
      if (!transformedOverrides[logicalName]) {
        transformedOverrides[logicalName] = {};
      }
      Object.assign(transformedOverrides[logicalName], flattenToDotNotation(overrideValue));
    } else {
      transformedOverrides[propertyName] = overrides[propertyName];
    }
  }
  return transformedOverrides;
}
function transformTransformsToLogicalNames(resourceName, resourceType, transforms) {
  const childResources = CHILD_RESOURCES[resourceType] || [];
  const propertyNameMap = new Map;
  for (const childResource of childResources) {
    if (childResource.logicalName && childResource.logicalName.name) {
      propertyNameMap.set(childResource.logicalName.name, childResource);
    }
  }
  const transformedTransforms = {};
  const errorMessage = `Transform of property {propertyName} of resource ${resourceName} is not supported.

Remove the transform, run 'stacktape compile:template' command, and find the logical name of the resource you want to transform manually. Then add it to the transforms object.`;
  for (const propertyName in transforms) {
    const childResource = propertyNameMap.get(propertyName);
    if (childResource?.unresolvable) {
      throw new Error(errorMessage.replace("{propertyName}", propertyName));
    }
    if (childResource) {
      const logicalNameFn = childResource.logicalName;
      let logicalName;
      try {
        logicalName = logicalNameFn(resourceName);
      } catch {
        try {
          logicalName = logicalNameFn();
        } catch {
          logicalName = propertyName;
        }
      }
      if (logicalName.includes("undefined")) {
        throw new Error(errorMessage.replace("{propertyName}", propertyName));
      }
      transformedTransforms[logicalName] = transforms[propertyName];
    } else {
      transformedTransforms[propertyName] = transforms[propertyName];
    }
  }
  return transformedTransforms;
}
var defineConfig = (configFn) => {
  return (params) => {
    const config = configFn(params);
    return transformConfigWithResources(config);
  };
};
var transformConfigWithResources = (config) => {
  if (!config || typeof config !== "object") {
    return config;
  }
  if (config.resources && typeof config.resources === "object") {
    for (const key in config.resources) {
      const resource = config.resources[key];
      if (isBaseResource(resource)) {
        resource[setResourceNameSymbol](key);
      }
    }
  }
  const result = {};
  for (const key in config) {
    if (key === "resources") {
      result[key] = transformResourceDefinitions(config[key]);
    } else if (key === "scripts") {
      result[key] = transformScriptDefinitions(config[key]);
    } else {
      result[key] = transformValue(config[key]);
    }
  }
  return result;
};
var transformEnvironment = (env) => {
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    return env;
  }
  return Object.entries(env).map(([name, value]) => ({
    name,
    value: transformValue(value)
  }));
};
var transformResourceDefinitions = (resources) => {
  if (!resources || typeof resources !== "object") {
    return resources;
  }
  const result = {};
  for (const key in resources) {
    const resource = resources[key];
    if (isBaseResource(resource)) {
      const type = resource[getTypeSymbol]();
      const properties = resource[getPropertiesSymbol]();
      const overrides = resource[getOverridesSymbol]();
      const transforms = resource[getTransformsSymbol]();
      result[key] = {
        type,
        properties: transformValue(properties),
        ...overrides !== undefined && { overrides: transformValue(overrides) },
        ...transforms !== undefined && { transforms }
      };
    } else {
      result[key] = transformValue(resource);
    }
  }
  return result;
};
var transformScriptDefinitions = (scripts) => {
  if (!scripts || typeof scripts !== "object") {
    return scripts;
  }
  const result = {};
  for (const key in scripts) {
    const script = scripts[key];
    if (isBaseTypeProperties(script)) {
      result[key] = {
        type: script.type,
        properties: transformValue(script.properties)
      };
    } else {
      result[key] = transformValue(script);
    }
  }
  return result;
};
var transformValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    const rewrittenDirective = rewriteEmbeddedDirectivesToCfFormat(value);
    if (rewrittenDirective !== null) {
      return rewrittenDirective;
    }
  }
  if (isDeferredResourceName(value)) {
    return value.resolve();
  }
  if (isResourceParamReference(value)) {
    return value.toString();
  }
  if (isBaseResource(value)) {
    return value.resourceName;
  }
  if (isBaseTypeProperties(value)) {
    if (!("properties" in value) || value.properties === undefined) {
      return { type: value.type };
    }
    return {
      type: value.type,
      properties: transformValue(value.properties)
    };
  }
  if (isAlarm(value)) {
    const result = {
      trigger: transformValue(value.trigger)
    };
    if (value.evaluation !== undefined) {
      result.evaluation = transformValue(value.evaluation);
    }
    if (value.notificationTargets !== undefined) {
      result.notificationTargets = transformValue(value.notificationTargets);
    }
    if (value.description !== undefined) {
      result.description = value.description;
    }
    return result;
  }
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (isBaseResource(item)) {
        return item.resourceName;
      }
      return transformValue(item);
    });
  }
  if (typeof value === "object") {
    const result = {};
    for (const key in value) {
      if (key === "environment" || key === "injectEnvironment") {
        result[key] = transformEnvironment(value[key]);
      } else {
        result[key] = transformValue(value[key]);
      }
    }
    return result;
  }
  return value;
};
var RUNTIME_DIRECTIVE_NAMES = new Set(["ResourceParam", "CfResourceParam", "Secret", "CfFormat", "CfStackOutput"]);
var rewriteEmbeddedDirectivesToCfFormat = (value) => {
  const embeddedDirectives = getEmbeddedDirectives(value);
  if (embeddedDirectives.length === 0) {
    return null;
  }
  if (embeddedDirectives.length === 1 && embeddedDirectives[0].startPos === 0 && embeddedDirectives[0].endPos === value.length) {
    return null;
  }
  let interpolatedString = "";
  let currentPos = 0;
  embeddedDirectives.forEach(({ startPos, endPos }) => {
    interpolatedString += `${value.slice(currentPos, startPos)}{}`;
    currentPos = endPos;
  });
  interpolatedString += value.slice(currentPos);
  const escapedInterpolatedString = interpolatedString.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  const directiveArgs = embeddedDirectives.map(({ definition }) => definition).join(", ");
  const hasRuntimeDirective = embeddedDirectives.some(({ name }) => RUNTIME_DIRECTIVE_NAMES.has(name));
  const formatDirectiveName = hasRuntimeDirective ? "CfFormat" : "Format";
  return `$${formatDirectiveName}('${escapedInterpolatedString}', ${directiveArgs})`;
};
var getEmbeddedDirectives = (value) => {
  const directives = [];
  const tryParseDirectiveAt = (str, startPos) => {
    if (str[startPos] !== "$") {
      return null;
    }
    let idx2 = startPos + 1;
    const firstNameChar = str[idx2];
    if (!firstNameChar || !firstNameChar.match(/[A-Z_]/i)) {
      return null;
    }
    while (idx2 < str.length && str[idx2].match(/[\w$]/)) {
      idx2++;
    }
    const name = str.slice(startPos + 1, idx2);
    if (str[idx2] !== "(") {
      return null;
    }
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let closingParenPos = -1;
    for (let i = idx2;i < str.length; i++) {
      const char = str[i];
      const prevChar = i > 0 ? str[i - 1] : "";
      if (char === "'" && prevChar !== "\\" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && prevChar !== "\\" && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      }
      if (!inSingleQuote && !inDoubleQuote) {
        if (char === "(") {
          depth++;
        } else if (char === ")") {
          depth--;
          if (depth === 0) {
            closingParenPos = i;
            break;
          }
        }
      }
    }
    if (closingParenPos === -1) {
      return null;
    }
    let endPos = closingParenPos + 1;
    if (str[endPos] === ".") {
      endPos++;
      while (endPos < str.length && str[endPos].match(/[\w$\.]/)) {
        endPos++;
      }
    }
    return {
      definition: str.slice(startPos, endPos),
      name,
      endPos
    };
  };
  let idx = 0;
  while (idx < value.length) {
    if (value[idx] === "$") {
      const parsed = tryParseDirectiveAt(value, idx);
      if (parsed) {
        directives.push({ definition: parsed.definition, name: parsed.name, startPos: idx, endPos: parsed.endPos });
        idx = parsed.endPos;
        continue;
      }
    }
    idx++;
  }
  return directives;
};
// src/api/npm/ts/directives.ts
var $ResourceParam = (resourceName, property) => {
  return `$ResourceParam('${resourceName}','${property}')`;
};
var $CfResourceParam = (cloudformationResourceLogicalId, property) => {
  return `$CfResourceParam('${cloudformationResourceLogicalId}','${property}')`;
};
var $Secret = (secretName) => {
  return `$Secret('${secretName}')`;
};
var $SsmParam = (paramName) => {
  return `$SsmParam('${paramName}')`;
};
var $CfFormat = (interpolatedString, ...values) => {
  return `$CfFormat('${interpolatedString}', '${values.join(",")}')`;
};
var $CfStackOutput = (stackName, outputName) => {
  return `$CfStackOutput('${stackName}','${outputName}')`;
};
var $GitInfo = () => {
  return "$GitInfo()";
};
var $Region = () => {
  return "$Region()";
};
var $Stage = () => {
  return "$Stage()";
};
// src/api/npm/ts/global-aws-services.ts
var AWS_SES = "aws:ses";
// src/api/npm/ts/class-config.ts
var RESOURCES_CONVERTIBLE_TO_CLASSES = [
  {
    className: "RelationalDatabase",
    resourceType: "relational-database",
    propsType: "RelationalDatabaseProps",
    interfaceName: "RelationalDatabase",
    sourceFile: "relational-databases.d.ts",
    canConnectTo: []
  },
  {
    className: "WebService",
    resourceType: "web-service",
    propsType: "WebServiceProps",
    interfaceName: "WebService",
    sourceFile: "web-services.d.ts",
    hasAugmentedProps: true,
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem",
      "PrivateService"
    ]
  },
  {
    className: "PrivateService",
    resourceType: "private-service",
    propsType: "PrivateServiceProps",
    interfaceName: "PrivateService",
    sourceFile: "private-services.d.ts",
    hasAugmentedProps: true,
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem"
    ]
  },
  {
    className: "WorkerService",
    resourceType: "worker-service",
    propsType: "WorkerServiceProps",
    interfaceName: "WorkerService",
    sourceFile: "worker-services.d.ts",
    hasAugmentedProps: true,
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem"
    ]
  },
  {
    className: "MultiContainerWorkload",
    resourceType: "multi-container-workload",
    propsType: "ContainerWorkloadProps",
    interfaceName: "MultiContainerWorkload",
    sourceFile: "multi-container-workloads.d.ts",
    hasAugmentedProps: true,
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem",
      "LambdaFunction",
      "BatchJob",
      "UserAuthPool"
    ]
  },
  {
    className: "LambdaFunction",
    resourceType: "function",
    propsType: "LambdaFunctionProps",
    interfaceName: "LambdaFunction",
    sourceFile: "functions.d.ts",
    hasAugmentedProps: true,
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem",
      "PrivateService",
      "WebService",
      "LambdaFunction",
      "BatchJob",
      "UserAuthPool"
    ]
  },
  {
    className: "BatchJob",
    resourceType: "batch-job",
    propsType: "BatchJobProps",
    interfaceName: "BatchJob",
    sourceFile: "batch-jobs.d.ts",
    hasAugmentedProps: true,
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem"
    ]
  },
  {
    className: "Bucket",
    resourceType: "bucket",
    propsType: "BucketProps",
    interfaceName: "Bucket",
    sourceFile: "buckets.d.ts",
    canConnectTo: []
  },
  {
    className: "HostingBucket",
    resourceType: "hosting-bucket",
    propsType: "HostingBucketProps",
    interfaceName: "HostingBucket",
    sourceFile: "hosting-buckets.d.ts",
    canConnectTo: []
  },
  {
    className: "DynamoDbTable",
    resourceType: "dynamo-db-table",
    propsType: "DynamoDbTableProps",
    interfaceName: "DynamoDbTable",
    sourceFile: "dynamo-db-tables.d.ts",
    canConnectTo: []
  },
  {
    className: "EventBus",
    resourceType: "event-bus",
    propsType: "EventBusProps",
    interfaceName: "EventBus",
    sourceFile: "event-buses.d.ts",
    canConnectTo: []
  },
  {
    className: "HttpApiGateway",
    resourceType: "http-api-gateway",
    propsType: "HttpApiGatewayProps",
    interfaceName: "HttpApiGateway",
    sourceFile: "http-api-gateways.d.ts",
    canConnectTo: []
  },
  {
    className: "ApplicationLoadBalancer",
    resourceType: "application-load-balancer",
    propsType: "ApplicationLoadBalancerProps",
    interfaceName: "ApplicationLoadBalancer",
    sourceFile: "application-load-balancers.d.ts",
    canConnectTo: []
  },
  {
    className: "NetworkLoadBalancer",
    resourceType: "network-load-balancer",
    propsType: "NetworkLoadBalancerProps",
    interfaceName: "NetworkLoadBalancer",
    sourceFile: "network-load-balancer.d.ts",
    canConnectTo: []
  },
  {
    className: "RedisCluster",
    resourceType: "redis-cluster",
    propsType: "RedisClusterProps",
    interfaceName: "RedisCluster",
    sourceFile: "redis-cluster.d.ts",
    canConnectTo: []
  },
  {
    className: "MongoDbAtlasCluster",
    resourceType: "mongo-db-atlas-cluster",
    propsType: "MongoDbAtlasClusterProps",
    interfaceName: "MongoDbAtlasCluster",
    sourceFile: "mongo-db-atlas-clusters.d.ts",
    supportsOverrides: false,
    canConnectTo: []
  },
  {
    className: "StateMachine",
    resourceType: "state-machine",
    propsType: "StateMachineProps",
    interfaceName: "StateMachine",
    sourceFile: "state-machines.d.ts",
    hasAugmentedProps: true,
    canConnectTo: ["Function", "BatchJob"]
  },
  {
    className: "UserAuthPool",
    resourceType: "user-auth-pool",
    propsType: "UserAuthPoolProps",
    interfaceName: "UserAuthPool",
    sourceFile: "user-pools.d.ts",
    canConnectTo: []
  },
  {
    className: "UpstashRedis",
    resourceType: "upstash-redis",
    propsType: "UpstashRedisProps",
    interfaceName: "UpstashRedis",
    sourceFile: "upstash-redis.d.ts",
    supportsOverrides: false,
    canConnectTo: []
  },
  {
    className: "SqsQueue",
    resourceType: "sqs-queue",
    propsType: "SqsQueueProps",
    interfaceName: "SqsQueue",
    sourceFile: "sqs-queues.d.ts",
    canConnectTo: []
  },
  {
    className: "SnsTopic",
    resourceType: "sns-topic",
    propsType: "SnsTopicProps",
    interfaceName: "SnsTopic",
    sourceFile: "sns-topic.d.ts",
    canConnectTo: []
  },
  {
    className: "KinesisStream",
    resourceType: "kinesis-stream",
    propsType: "KinesisStreamProps",
    interfaceName: "KinesisStream",
    sourceFile: "kinesis-streams.d.ts",
    canConnectTo: []
  },
  {
    className: "WebAppFirewall",
    resourceType: "web-app-firewall",
    propsType: "WebAppFirewallProps",
    interfaceName: "WebAppFirewall",
    sourceFile: "web-app-firewall.d.ts",
    canConnectTo: []
  },
  {
    className: "OpenSearchDomain",
    resourceType: "open-search-domain",
    propsType: "OpenSearchDomainProps",
    interfaceName: "OpenSearchDomain",
    sourceFile: "open-search.d.ts",
    canConnectTo: []
  },
  {
    className: "EfsFilesystem",
    resourceType: "efs-filesystem",
    propsType: "EfsFilesystemProps",
    interfaceName: "EfsFilesystem",
    sourceFile: "efs-filesystem.d.ts",
    canConnectTo: []
  },
  {
    className: "NextjsWeb",
    resourceType: "nextjs-web",
    propsType: "NextjsWebProps",
    interfaceName: "NextjsWeb",
    sourceFile: "nextjs-web.d.ts",
    hasAugmentedProps: true,
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem",
      "PrivateService",
      "WebService",
      "LambdaFunction",
      "BatchJob",
      "UserAuthPool"
    ]
  },
  {
    className: "AstroWeb",
    resourceType: "astro-web",
    propsType: "AstroWebProps",
    interfaceName: "AstroWeb",
    sourceFile: "astro-web.d.ts",
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem",
      "PrivateService",
      "WebService",
      "LambdaFunction",
      "BatchJob",
      "UserAuthPool"
    ]
  },
  {
    className: "NuxtWeb",
    resourceType: "nuxt-web",
    propsType: "NuxtWebProps",
    interfaceName: "NuxtWeb",
    sourceFile: "nuxt-web.d.ts",
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem",
      "PrivateService",
      "WebService",
      "LambdaFunction",
      "BatchJob",
      "UserAuthPool"
    ]
  },
  {
    className: "SvelteKitWeb",
    resourceType: "sveltekit-web",
    propsType: "SvelteKitWebProps",
    interfaceName: "SvelteKitWeb",
    sourceFile: "sveltekit-web.d.ts",
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem",
      "PrivateService",
      "WebService",
      "LambdaFunction",
      "BatchJob",
      "UserAuthPool"
    ]
  },
  {
    className: "SolidStartWeb",
    resourceType: "solidstart-web",
    propsType: "SolidStartWebProps",
    interfaceName: "SolidStartWeb",
    sourceFile: "solidstart-web.d.ts",
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem",
      "PrivateService",
      "WebService",
      "LambdaFunction",
      "BatchJob",
      "UserAuthPool"
    ]
  },
  {
    className: "TanStackWeb",
    resourceType: "tanstack-web",
    propsType: "TanStackWebProps",
    interfaceName: "TanStackWeb",
    sourceFile: "tanstack-web.d.ts",
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem",
      "PrivateService",
      "WebService",
      "LambdaFunction",
      "BatchJob",
      "UserAuthPool"
    ]
  },
  {
    className: "RemixWeb",
    resourceType: "remix-web",
    propsType: "RemixWebProps",
    interfaceName: "RemixWeb",
    sourceFile: "remix-web.d.ts",
    canConnectTo: [
      "RelationalDatabase",
      "Bucket",
      "HostingBucket",
      "DynamoDbTable",
      "EventBus",
      "RedisCluster",
      "MongoDbAtlasCluster",
      "UpstashRedis",
      "SqsQueue",
      "SnsTopic",
      "KinesisStream",
      "OpenSearchDomain",
      "EfsFilesystem",
      "PrivateService",
      "WebService",
      "LambdaFunction",
      "BatchJob",
      "UserAuthPool"
    ]
  },
  {
    className: "Bastion",
    resourceType: "bastion",
    propsType: "BastionProps",
    interfaceName: "Bastion",
    sourceFile: "bastion.d.ts",
    canConnectTo: []
  }
];
var MISC_TYPES_CONVERTIBLE_TO_CLASSES = [
  {
    className: "RdsEnginePostgres",
    typeValue: "postgres",
    propsType: "RdsEngineProperties",
    interfaceName: "RdsEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "RdsEngineMariadb",
    typeValue: "mariadb",
    propsType: "RdsEngineProperties",
    interfaceName: "RdsEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "RdsEngineMysql",
    typeValue: "mysql",
    propsType: "RdsEngineProperties",
    interfaceName: "RdsEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "RdsEngineOracleEE",
    typeValue: "oracle-ee",
    propsType: "RdsEngineProperties",
    interfaceName: "RdsEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "RdsEngineOracleSE2",
    typeValue: "oracle-se2",
    propsType: "RdsEngineProperties",
    interfaceName: "RdsEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "RdsEngineSqlServerEE",
    typeValue: "sqlserver-ee",
    propsType: "RdsEngineProperties",
    interfaceName: "RdsEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "RdsEngineSqlServerEX",
    typeValue: "sqlserver-ex",
    propsType: "RdsEngineProperties",
    interfaceName: "RdsEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "RdsEngineSqlServerSE",
    typeValue: "sqlserver-se",
    propsType: "RdsEngineProperties",
    interfaceName: "RdsEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "RdsEngineSqlServerWeb",
    typeValue: "sqlserver-web",
    propsType: "RdsEngineProperties",
    interfaceName: "RdsEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "AuroraEnginePostgresql",
    typeValue: "aurora-postgresql",
    propsType: "AuroraEngineProperties",
    interfaceName: "AuroraEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "AuroraEngineMysql",
    typeValue: "aurora-mysql",
    propsType: "AuroraEngineProperties",
    interfaceName: "AuroraEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "AuroraServerlessEnginePostgresql",
    typeValue: "aurora-postgresql-serverless",
    propsType: "AuroraServerlessEngineProperties",
    interfaceName: "AuroraServerlessEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "AuroraServerlessEngineMysql",
    typeValue: "aurora-mysql-serverless",
    propsType: "AuroraServerlessEngineProperties",
    interfaceName: "AuroraServerlessEngine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "AuroraServerlessV2EnginePostgresql",
    typeValue: "aurora-postgresql-serverless-v2",
    propsType: "AuroraServerlessV2EngineProperties",
    interfaceName: "AuroraServerlessV2Engine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "AuroraServerlessV2EngineMysql",
    typeValue: "aurora-mysql-serverless-v2",
    propsType: "AuroraServerlessV2EngineProperties",
    interfaceName: "AuroraServerlessV2Engine",
    sourceFile: "relational-databases.d.ts"
  },
  {
    className: "StacktapeLambdaBuildpackPackaging",
    typeValue: "stacktape-lambda-buildpack",
    propsType: "StpBuildpackLambdaPackagingProps",
    interfaceName: "StpBuildpackLambdaPackaging",
    sourceFile: "deployment-artifacts.d.ts"
  },
  {
    className: "CustomArtifactLambdaPackaging",
    typeValue: "custom-artifact",
    propsType: "CustomArtifactLambdaPackagingProps",
    interfaceName: "CustomArtifactLambdaPackaging",
    sourceFile: "deployment-artifacts.d.ts"
  },
  {
    className: "PrebuiltImagePackaging",
    typeValue: "prebuilt-image",
    propsType: "PrebuiltImageCwPackagingProps",
    interfaceName: "PrebuiltCwImagePackaging",
    sourceFile: "deployment-artifacts.d.ts"
  },
  {
    className: "CustomDockerfilePackaging",
    typeValue: "custom-dockerfile",
    propsType: "CustomDockerfileCwImagePackagingProps",
    interfaceName: "CustomDockerfileCwImagePackaging",
    sourceFile: "deployment-artifacts.d.ts"
  },
  {
    className: "ExternalBuildpackPackaging",
    typeValue: "external-buildpack",
    propsType: "ExternalBuildpackCwImagePackagingProps",
    interfaceName: "ExternalBuildpackCwImagePackaging",
    sourceFile: "deployment-artifacts.d.ts"
  },
  {
    className: "NixpacksPackaging",
    typeValue: "nixpacks",
    propsType: "NixpacksCwImagePackagingProps",
    interfaceName: "NixpacksCwImagePackaging",
    sourceFile: "deployment-artifacts.d.ts"
  },
  {
    className: "StacktapeImageBuildpackPackaging",
    typeValue: "stacktape-image-buildpack",
    propsType: "StpBuildpackCwImagePackagingProps",
    interfaceName: "StpBuildpackCwImagePackaging",
    sourceFile: "deployment-artifacts.d.ts"
  },
  {
    className: "HttpApiIntegration",
    typeValue: "http-api-gateway",
    propsType: "HttpApiIntegrationProps",
    interfaceName: "HttpApiIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "S3Integration",
    typeValue: "s3",
    propsType: "S3IntegrationProps",
    interfaceName: "S3Integration",
    sourceFile: "events.d.ts"
  },
  {
    className: "ScheduleIntegration",
    typeValue: "schedule",
    propsType: "ScheduleIntegrationProps",
    interfaceName: "ScheduleIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "SnsIntegration",
    typeValue: "sns",
    propsType: "SnsIntegrationProps",
    interfaceName: "SnsIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "SqsIntegration",
    typeValue: "sqs",
    propsType: "SqsIntegrationProps",
    interfaceName: "SqsIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "KinesisIntegration",
    typeValue: "kinesis",
    propsType: "KinesisIntegrationProps",
    interfaceName: "KinesisIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "DynamoDbIntegration",
    typeValue: "dynamodb",
    propsType: "DynamoDbIntegrationProps",
    interfaceName: "DynamoDbIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "CloudwatchLogIntegration",
    typeValue: "cloudwatch-logs",
    propsType: "CloudwatchLogIntegrationProps",
    interfaceName: "CloudwatchLogIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "ApplicationLoadBalancerIntegration",
    typeValue: "application-load-balancer",
    propsType: "ApplicationLoadBalancerIntegrationProps",
    interfaceName: "ApplicationLoadBalancerIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "EventBusIntegration",
    typeValue: "event-bus",
    propsType: "EventBusIntegrationProps",
    interfaceName: "EventBusIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "KafkaTopicIntegration",
    typeValue: "kafka-topic",
    propsType: "KafkaTopicIntegrationProps",
    interfaceName: "KafkaTopicIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "AlarmIntegration",
    typeValue: "alarm",
    propsType: "AlarmIntegrationProps",
    interfaceName: "AlarmIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "IotIntegration",
    typeValue: "iot",
    propsType: "IotIntegrationProps",
    interfaceName: "IotIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "CdnLoadBalancerRoute",
    typeValue: "application-load-balancer",
    propsType: "CdnLoadBalancerOrigin",
    interfaceName: "CdnLoadBalancerOrigin",
    sourceFile: "cdn.d.ts"
  },
  {
    className: "CdnHttpApiGatewayRoute",
    typeValue: "http-api-gateway",
    propsType: "CdnHttpApiGatewayOrigin",
    interfaceName: "CdnHttpApiGatewayOrigin",
    sourceFile: "cdn.d.ts"
  },
  {
    className: "CdnLambdaFunctionRoute",
    typeValue: "function",
    propsType: "CdnLambdaFunctionOrigin",
    interfaceName: "CdnLambdaFunctionOrigin",
    sourceFile: "cdn.d.ts"
  },
  {
    className: "CdnCustomDomainRoute",
    typeValue: "custom-origin",
    propsType: "CdnCustomOrigin",
    interfaceName: "CdnCustomOrigin",
    sourceFile: "cdn.d.ts"
  },
  {
    className: "CdnBucketRoute",
    typeValue: "bucket",
    propsType: "CdnBucketOrigin",
    interfaceName: "CdnBucketOrigin",
    sourceFile: "cdn.d.ts"
  },
  {
    className: "ManagedRuleGroup",
    typeValue: "managed-rule-group",
    propsType: "ManagedRuleGroupProps",
    interfaceName: "ManagedRuleGroup",
    sourceFile: "web-app-firewall.d.ts"
  },
  {
    className: "CustomRuleGroup",
    typeValue: "custom-rule-group",
    propsType: "CustomRuleGroupProps",
    interfaceName: "CustomRuleGroup",
    sourceFile: "web-app-firewall.d.ts"
  },
  {
    className: "RateBasedRule",
    typeValue: "rate-based-rule",
    propsType: "RateBasedStatementProps",
    interfaceName: "RateBasedRule",
    sourceFile: "web-app-firewall.d.ts"
  },
  {
    className: "SqsQueueEventBusIntegration",
    typeValue: "event-bus",
    propsType: "SqsQueueEventBusIntegrationProps",
    interfaceName: "SqsQueueEventBusIntegration",
    sourceFile: "sqs-queues.d.ts"
  },
  {
    className: "MultiContainerWorkloadHttpApiIntegration",
    typeValue: "http-api-gateway",
    propsType: "ContainerWorkloadHttpApiIntegrationProps",
    interfaceName: "ContainerWorkloadHttpApiIntegration",
    sourceFile: "multi-container-workloads.d.ts"
  },
  {
    className: "MultiContainerWorkloadLoadBalancerIntegration",
    typeValue: "application-load-balancer",
    propsType: "ContainerWorkloadLoadBalancerIntegrationProps",
    interfaceName: "ContainerWorkloadLoadBalancerIntegration",
    sourceFile: "multi-container-workloads.d.ts"
  },
  {
    className: "MultiContainerWorkloadNetworkLoadBalancerIntegration",
    typeValue: "network-load-balancer",
    propsType: "ContainerWorkloadNetworkLoadBalancerIntegrationProps",
    interfaceName: "ContainerWorkloadNetworkLoadBalancerIntegration",
    sourceFile: "multi-container-workloads.d.ts"
  },
  {
    className: "MultiContainerWorkloadInternalIntegration",
    typeValue: "workload-internal",
    propsType: "ContainerWorkloadInternalIntegrationProps",
    interfaceName: "ContainerWorkloadInternalIntegration",
    sourceFile: "multi-container-workloads.d.ts"
  },
  {
    className: "MultiContainerWorkloadServiceConnectIntegration",
    typeValue: "service-connect",
    propsType: "ContainerWorkloadServiceConnectIntegrationProps",
    interfaceName: "ContainerWorkloadServiceConnectIntegration",
    sourceFile: "multi-container-workloads.d.ts"
  },
  {
    className: "LocalScript",
    typeValue: "local-script",
    propsType: "LocalScriptProps",
    interfaceName: "LocalScript",
    sourceFile: "__helpers.d.ts"
  },
  {
    className: "BastionScript",
    typeValue: "bastion-script",
    propsType: "BastionScriptProps",
    interfaceName: "BastionScript",
    sourceFile: "__helpers.d.ts"
  },
  {
    className: "LocalScriptWithBastionTunneling",
    typeValue: "local-script-with-bastion-tunneling",
    propsType: "LocalScriptWithBastionTunnelingProps",
    interfaceName: "LocalScriptWithBastionTunneling",
    sourceFile: "__helpers.d.ts"
  },
  {
    className: "HttpEndpointLogForwarding",
    typeValue: "http-endpoint",
    propsType: "HttpEndpointLogForwardingProps",
    interfaceName: "HttpEndpointLogForwarding",
    sourceFile: "__helpers.d.ts"
  },
  {
    className: "HighlightLogForwarding",
    typeValue: "highlight",
    propsType: "HighlightLogForwardingProps",
    interfaceName: "HighlightLogForwarding",
    sourceFile: "__helpers.d.ts"
  },
  {
    className: "DatadogLogForwarding",
    typeValue: "datadog",
    propsType: "DatadogLogForwardingProps",
    interfaceName: "DatadogLogForwarding",
    sourceFile: "__helpers.d.ts"
  },
  {
    className: "ExpirationLifecycleRule",
    typeValue: "expiration",
    propsType: "ExpirationProps",
    interfaceName: "ExpirationLifecycleRule",
    sourceFile: "buckets.d.ts"
  },
  {
    className: "NonCurrentVersionExpirationLifecycleRule",
    typeValue: "non-current-version-expiration",
    propsType: "NonCurrentVersionExpirationProps",
    interfaceName: "NonCurrentVersionExpirationLifecycleRule",
    sourceFile: "buckets.d.ts"
  },
  {
    className: "ContainerEfsMount",
    typeValue: "efs",
    propsType: "ContainerEfsMountProps",
    interfaceName: "ContainerEfsMount",
    sourceFile: "__helpers.d.ts"
  },
  {
    className: "LambdaEfsMount",
    typeValue: "efs",
    propsType: "LambdaEfsMountProps",
    interfaceName: "LambdaEfsMount",
    sourceFile: "functions.d.ts"
  },
  {
    className: "CognitoAuthorizer",
    typeValue: "cognito",
    propsType: "CognitoAuthorizerProperties",
    interfaceName: "CognitoAuthorizer",
    sourceFile: "user-pools.d.ts"
  },
  {
    className: "LambdaAuthorizer",
    typeValue: "lambda",
    propsType: "LambdaAuthorizerProperties",
    interfaceName: "LambdaAuthorizer",
    sourceFile: "user-pools.d.ts"
  },
  {
    className: "ApplicationLoadBalancerCustomTrigger",
    typeValue: "application-load-balancer-custom",
    propsType: "ApplicationLoadBalancerCustomTriggerProps",
    interfaceName: "ApplicationLoadBalancerCustomTrigger",
    sourceFile: "alarm-metrics.d.ts",
    jsdoc: "Triggers an alarm based on any Application Load Balancer CloudWatch metric (e.g., connection counts, request counts, target response times)."
  },
  {
    className: "ApplicationLoadBalancerErrorRateTrigger",
    typeValue: "application-load-balancer-error-rate",
    propsType: "ApplicationLoadBalancerErrorRateTriggerProps",
    interfaceName: "ApplicationLoadBalancerErrorRateTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when the Application Load Balancer error rate (percentage of 4xx/5xx responses) exceeds the threshold."
  },
  {
    className: "ApplicationLoadBalancerUnhealthyTargetsTrigger",
    typeValue: "application-load-balancer-unhealthy-targets",
    propsType: "ApplicationLoadBalancerUnhealthyTargetsTriggerProps",
    interfaceName: "ApplicationLoadBalancerUnhealthyTargetsTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when the percentage of unhealthy targets behind the Application Load Balancer exceeds the threshold."
  },
  {
    className: "HttpApiGatewayErrorRateTrigger",
    typeValue: "http-api-gateway-error-rate",
    propsType: "HttpApiGatewayErrorRateTriggerProps",
    interfaceName: "HttpApiGatewayErrorRateTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when the HTTP API Gateway error rate (percentage of 4xx/5xx responses) exceeds the threshold."
  },
  {
    className: "HttpApiGatewayLatencyTrigger",
    typeValue: "http-api-gateway-latency",
    propsType: "HttpApiGatewayLatencyTriggerProps",
    interfaceName: "HttpApiGatewayLatencyTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when HTTP API Gateway latency exceeds the threshold. Latency is measured from request receipt to response sent."
  },
  {
    className: "RelationalDatabaseReadLatencyTrigger",
    typeValue: "database-read-latency",
    propsType: "RelationalDatabaseReadLatencyTriggerProps",
    interfaceName: "RelationalDatabaseReadLatencyTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when database read latency (average time for read I/O operations) exceeds the threshold."
  },
  {
    className: "RelationalDatabaseWriteLatencyTrigger",
    typeValue: "database-write-latency",
    propsType: "RelationalDatabaseWriteLatencyTriggerProps",
    interfaceName: "RelationalDatabaseWriteLatencyTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when database write latency (average time for write I/O operations) exceeds the threshold."
  },
  {
    className: "RelationalDatabaseCPUUtilizationTrigger",
    typeValue: "database-cpu-utilization",
    propsType: "RelationalDatabaseCPUUtilizationTriggerProps",
    interfaceName: "RelationalDatabaseCPUUtilizationTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when database CPU utilization exceeds the threshold percentage."
  },
  {
    className: "RelationalDatabaseFreeStorageTrigger",
    typeValue: "database-free-storage",
    propsType: "RelationalDatabaseFreeStorageTriggerProps",
    interfaceName: "RelationalDatabaseFreeStorageTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when available database storage falls below the threshold (in MB)."
  },
  {
    className: "RelationalDatabaseFreeMemoryTrigger",
    typeValue: "database-free-memory",
    propsType: "RelationalDatabaseFreeMemoryTriggerProps",
    interfaceName: "RelationalDatabaseFreeMemoryTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when available database memory falls below the threshold (in MB)."
  },
  {
    className: "RelationalDatabaseConnectionCountTrigger",
    typeValue: "database-connection-count",
    propsType: "RelationalDatabaseConnectionCountTriggerProps",
    interfaceName: "RelationalDatabaseConnectionCountTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when the number of database connections exceeds the threshold."
  },
  {
    className: "SqsQueueReceivedMessagesCountTrigger",
    typeValue: "sqs-queue-received-messages-count",
    propsType: "SqsQueueReceivedMessagesCountTriggerProps",
    interfaceName: "SqsQueueReceivedMessagesCountTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when the number of messages received from an SQS queue crosses the threshold."
  },
  {
    className: "SqsQueueNotEmptyTrigger",
    typeValue: "sqs-queue-not-empty",
    propsType: "SqsQueueNotEmptyTrigger",
    interfaceName: "SqsQueueNotEmptyTrigger",
    sourceFile: "alarms.d.ts",
    typeOnly: true,
    jsdoc: "Triggers an alarm if the SQS queue is not empty. Useful for monitoring dead-letter queues."
  },
  {
    className: "LambdaErrorRateTrigger",
    typeValue: "lambda-error-rate",
    propsType: "LambdaErrorRateTriggerProps",
    interfaceName: "LambdaErrorRateTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when the Lambda function error rate (percentage of failed invocations) exceeds the threshold."
  },
  {
    className: "LambdaDurationTrigger",
    typeValue: "lambda-duration",
    propsType: "LambdaDurationTriggerProps",
    interfaceName: "LambdaDurationTrigger",
    sourceFile: "alarms.d.ts",
    jsdoc: "Triggers an alarm when Lambda function execution duration exceeds the threshold (in milliseconds)."
  },
  {
    className: "CustomResourceDefinition",
    typeValue: "custom-resource-definition",
    propsType: "CustomResourceDefinitionProps",
    interfaceName: "CustomResourceDefinition",
    sourceFile: "custom-resources.d.ts"
  },
  {
    className: "CustomResourceInstance",
    typeValue: "custom-resource-instance",
    propsType: "CustomResourceInstanceProps",
    interfaceName: "CustomResourceInstance",
    sourceFile: "custom-resources.d.ts"
  },
  {
    className: "DeploymentScript",
    typeValue: "deployment-script",
    propsType: "DeploymentScriptProps",
    interfaceName: "DeploymentScript",
    sourceFile: "deployment-script.d.ts"
  },
  {
    className: "EdgeLambdaFunction",
    typeValue: "edge-lambda-function",
    propsType: "EdgeLambdaFunctionProps",
    interfaceName: "EdgeLambdaFunction",
    sourceFile: "edge-lambda-functions.d.ts"
  }
];
var RESOURCE_TYPE_TO_CLASS = Object.fromEntries(RESOURCES_CONVERTIBLE_TO_CLASSES.map((r) => [r.resourceType, r.className]));
var SCRIPT_TYPE_TO_CLASS = Object.fromEntries(MISC_TYPES_CONVERTIBLE_TO_CLASSES.filter((t) => t.sourceFile === "__helpers.d.ts" && t.propsType.includes("Script")).map((t) => [t.typeValue, t.className]));
var PACKAGING_TYPE_TO_CLASS = Object.fromEntries(MISC_TYPES_CONVERTIBLE_TO_CLASSES.filter((t) => t.sourceFile === "deployment-artifacts.d.ts").map((t) => [
  t.typeValue,
  t.className
]));
var ENGINE_TYPE_TO_CLASS = Object.fromEntries(MISC_TYPES_CONVERTIBLE_TO_CLASSES.filter((t) => t.propsType.includes("Engine")).map((t) => [t.typeValue, t.className]));

// src/api/npm/ts/resource-metadata.ts
var REFERENCEABLE_PARAMS = {
  "relational-database": [
    { name: "connectionString", description: "Connection string for the database" },
    { name: "jdbcConnectionString", description: "JDBC connection string" },
    { name: "host", description: "Database host" },
    { name: "port", description: "Database port" },
    { name: "dbName", description: "Database name" },
    { name: "readerHost", description: "Reader endpoint host" },
    { name: "readerConnectionString", description: "Reader connection string" },
    { name: "readerJdbcConnectionString", description: "Reader JDBC connection string" }
  ],
  "web-service": [
    { name: "domain", description: "Web service domain" },
    { name: "url", description: "Web service URL" },
    { name: "customDomains", description: "Custom domains" },
    { name: "customDomainUrls", description: "Custom domain URLs" }
  ],
  "private-service": [{ name: "address", description: "Private service address" }],
  bucket: [
    { name: "name", description: "Bucket name" },
    { name: "arn", description: "Bucket ARN" }
  ],
  "dynamo-db-table": [
    { name: "name", description: "Table name" },
    { name: "arn", description: "Table ARN" },
    { name: "streamArn", description: "Stream ARN" }
  ],
  function: [
    { name: "arn", description: "Function ARN" },
    { name: "logGroupArn", description: "Log group ARN" }
  ],
  "batch-job": [
    { name: "jobDefinitionArn", description: "Job definition ARN" },
    { name: "stateMachineArn", description: "State machine ARN" },
    { name: "logGroupArn", description: "Log group ARN" }
  ],
  "event-bus": [
    { name: "arn", description: "Event bus ARN" },
    { name: "archiveArn", description: "Archive ARN" }
  ],
  "http-api-gateway": [
    { name: "domain", description: "API Gateway domain" },
    { name: "url", description: "API Gateway URL" },
    { name: "customDomains", description: "Custom domains" },
    { name: "customDomainUrls", description: "Custom domain URLs" },
    { name: "customDomainUrl", description: "First custom domain URL" }
  ],
  "mongo-db-atlas-cluster": [{ name: "connectionString", description: "MongoDB connection string" }],
  "redis-cluster": [
    { name: "host", description: "Redis host" },
    { name: "readerHost", description: "Redis reader host" },
    { name: "port", description: "Redis port" },
    { name: "sharding", description: "Sharding status" }
  ],
  "state-machine": [
    { name: "arn", description: "State machine ARN" },
    { name: "name", description: "State machine name" }
  ],
  "user-auth-pool": [
    { name: "id", description: "User pool ID" },
    { name: "clientId", description: "Client ID" },
    { name: "domain", description: "User pool domain" }
  ],
  "upstash-redis": [
    { name: "host", description: "Upstash Redis host" },
    { name: "port", description: "Upstash Redis port" },
    { name: "password", description: "Password" },
    { name: "restToken", description: "REST token" },
    { name: "readOnlyRestToken", description: "Read-only REST token" },
    { name: "restUrl", description: "REST URL" },
    { name: "redisUrl", description: "Redis URL" }
  ],
  "application-load-balancer": [
    { name: "domain", description: "Load balancer domain" },
    { name: "customDomains", description: "Custom domains" }
  ],
  "network-load-balancer": [
    { name: "domain", description: "Load balancer domain" },
    { name: "customDomains", description: "Custom domains" }
  ],
  "hosting-bucket": [
    { name: "name", description: "Bucket name" },
    { name: "arn", description: "Bucket ARN" }
  ],
  "web-app-firewall": [
    { name: "arn", description: "Firewall ARN" },
    { name: "scope", description: "Firewall scope" }
  ],
  "open-search-domain": [
    { name: "domainEndpoint", description: "OpenSearch domain endpoint" },
    { name: "arn", description: "Domain ARN" }
  ],
  "efs-filesystem": [
    { name: "arn", description: "EFS ARN" },
    { name: "id", description: "EFS ID" }
  ],
  "nextjs-web": [{ name: "url", description: "Website URL" }],
  "astro-web": [{ name: "url", description: "Website URL" }],
  "nuxt-web": [{ name: "url", description: "Website URL" }],
  "sveltekit-web": [{ name: "url", description: "Website URL" }],
  "solidstart-web": [{ name: "url", description: "Website URL" }],
  "tanstack-web": [{ name: "url", description: "Website URL" }],
  "remix-web": [{ name: "url", description: "Website URL" }],
  "multi-container-workload": [{ name: "logGroupArn", description: "Log group ARN" }],
  "sqs-queue": [
    { name: "arn", description: "Queue ARN" },
    { name: "url", description: "Queue URL" },
    { name: "name", description: "Queue name" }
  ],
  "sns-topic": [
    { name: "arn", description: "Topic ARN" },
    { name: "name", description: "Topic name" }
  ]
};

// src/api/npm/ts/resources.ts
var getParamReferenceSymbol2 = Symbol.for("stacktape:getParamReference");
function createResourceClass(className, resourceType) {
  const ResourceClass = class extends BaseResource {
    constructor(nameOrProperties, properties) {
      if (typeof nameOrProperties === "string") {
        super(nameOrProperties, resourceType, properties);
      } else {
        super(undefined, resourceType, nameOrProperties);
      }
    }
  };
  Object.defineProperty(ResourceClass, "name", { value: className });
  const referenceableParams = REFERENCEABLE_PARAMS[resourceType] || [];
  for (const param of referenceableParams) {
    Object.defineProperty(ResourceClass.prototype, param.name, {
      get() {
        return this[getParamReferenceSymbol2](param.name);
      },
      enumerable: false,
      configurable: true
    });
  }
  return ResourceClass;
}
var RESOURCE_CLASSES = {};
for (const def of RESOURCES_CONVERTIBLE_TO_CLASSES) {
  RESOURCE_CLASSES[def.className] = createResourceClass(def.className, def.resourceType);
}
var {
  RelationalDatabase,
  WebService,
  PrivateService,
  WorkerService,
  MultiContainerWorkload,
  LambdaFunction,
  BatchJob,
  Bucket,
  HostingBucket,
  DynamoDbTable,
  EventBus,
  HttpApiGateway,
  ApplicationLoadBalancer,
  NetworkLoadBalancer,
  RedisCluster,
  MongoDbAtlasCluster,
  StateMachine,
  UserAuthPool,
  UpstashRedis,
  SqsQueue,
  SnsTopic,
  KinesisStream,
  WebAppFirewall,
  OpenSearchDomain,
  EfsFilesystem,
  NextjsWeb,
  Bastion
} = RESOURCE_CLASSES;
// src/api/npm/ts/type-properties.ts
function createTypePropertiesClass(className, typeValue, typeOnly) {
  if (typeOnly) {
    const TypeOnlyClass = class extends BaseTypeOnly {
      constructor() {
        super(typeValue);
      }
    };
    Object.defineProperty(TypeOnlyClass, "name", { value: className });
    return TypeOnlyClass;
  }
  const TypePropertiesClass = class extends BaseTypeProperties {
    constructor(properties) {
      super(typeValue, properties);
    }
  };
  Object.defineProperty(TypePropertiesClass, "name", { value: className });
  return TypePropertiesClass;
}
var TYPE_PROPERTIES_CLASSES = {};
for (const def of MISC_TYPES_CONVERTIBLE_TO_CLASSES) {
  TYPE_PROPERTIES_CLASSES[def.className] = createTypePropertiesClass(def.className, def.typeValue, def.typeOnly);
}
var {
  RdsEnginePostgres,
  RdsEngineMariadb,
  RdsEngineMysql,
  RdsEngineOracleEE,
  RdsEngineOracleSE2,
  RdsEngineSqlServerEE,
  RdsEngineSqlServerEX,
  RdsEngineSqlServerSE,
  RdsEngineSqlServerWeb,
  AuroraEnginePostgresql,
  AuroraEngineMysql,
  AuroraServerlessEnginePostgresql,
  AuroraServerlessEngineMysql,
  AuroraServerlessV2EnginePostgresql,
  AuroraServerlessV2EngineMysql,
  StacktapeLambdaBuildpackPackaging,
  CustomArtifactLambdaPackaging,
  PrebuiltImagePackaging,
  CustomDockerfilePackaging,
  ExternalBuildpackPackaging,
  NixpacksPackaging,
  StacktapeImageBuildpackPackaging,
  HttpApiIntegration,
  S3Integration,
  ScheduleIntegration,
  SnsIntegration,
  SqsIntegration,
  KinesisIntegration,
  DynamoDbIntegration,
  CloudwatchLogIntegration,
  ApplicationLoadBalancerIntegration,
  EventBusIntegration,
  KafkaTopicIntegration,
  AlarmIntegration,
  IotIntegration,
  CdnLoadBalancerRoute,
  CdnHttpApiGatewayRoute,
  CdnLambdaFunctionRoute,
  CdnCustomDomainRoute,
  CdnBucketRoute,
  ManagedRuleGroup,
  CustomRuleGroup,
  RateBasedRule,
  SqsQueueEventBusIntegration,
  MultiContainerWorkloadHttpApiIntegration,
  MultiContainerWorkloadLoadBalancerIntegration,
  MultiContainerWorkloadNetworkLoadBalancerIntegration,
  MultiContainerWorkloadInternalIntegration,
  MultiContainerWorkloadServiceConnectIntegration,
  LocalScript,
  BastionScript,
  LocalScriptWithBastionTunneling,
  HttpEndpointLogForwarding,
  HighlightLogForwarding,
  DatadogLogForwarding,
  ExpirationLifecycleRule,
  NonCurrentVersionExpirationLifecycleRule,
  ContainerEfsMount,
  LambdaEfsMount,
  CognitoAuthorizer,
  LambdaAuthorizer,
  ApplicationLoadBalancerCustomTrigger,
  ApplicationLoadBalancerErrorRateTrigger,
  ApplicationLoadBalancerUnhealthyTargetsTrigger,
  HttpApiGatewayErrorRateTrigger,
  HttpApiGatewayLatencyTrigger,
  RelationalDatabaseReadLatencyTrigger,
  RelationalDatabaseWriteLatencyTrigger,
  RelationalDatabaseCPUUtilizationTrigger,
  RelationalDatabaseFreeStorageTrigger,
  RelationalDatabaseFreeMemoryTrigger,
  RelationalDatabaseConnectionCountTrigger,
  SqsQueueReceivedMessagesCountTrigger,
  SqsQueueNotEmptyTrigger,
  LambdaErrorRateTrigger,
  LambdaDurationTrigger,
  CustomResourceDefinition,
  CustomResourceInstance,
  DeploymentScript,
  EdgeLambdaFunction
} = TYPE_PROPERTIES_CLASSES;

//# debugId=DC32870A2A66FD5E64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi5cXG5vZGVfbW9kdWxlc1xcY2hhbmdlLWNhc2VcXGRpc3RcXGluZGV4LmpzIiwgIi4uXFxzaGFyZWRcXG5hbWluZ1xcbG9naWNhbC1uYW1lcy50cyIsICIuLlxcc3JjXFxhcGlcXG5wbVxcdHNcXGNoaWxkLXJlc291cmNlcy50cyIsICIuLlxcc3JjXFxhcGlcXG5wbVxcdHNcXGNvbmZpZy50cyIsICIuLlxcc3JjXFxhcGlcXG5wbVxcdHNcXGRpcmVjdGl2ZXMudHMiLCAiLi5cXHNyY1xcYXBpXFxucG1cXHRzXFxnbG9iYWwtYXdzLXNlcnZpY2VzLnRzIiwgIi4uXFxzcmNcXGFwaVxcbnBtXFx0c1xcY2xhc3MtY29uZmlnLnRzIiwgIi4uXFxzcmNcXGFwaVxcbnBtXFx0c1xccmVzb3VyY2UtbWV0YWRhdGEudHMiLCAiLi5cXHNyY1xcYXBpXFxucG1cXHRzXFxyZXNvdXJjZXMudHMiLCAiLi5cXHNyY1xcYXBpXFxucG1cXHRzXFx0eXBlLXByb3BlcnRpZXMudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiLy8gUmVnZXhwcyBpbnZvbHZlZCB3aXRoIHNwbGl0dGluZyB3b3JkcyBpbiB2YXJpb3VzIGNhc2UgZm9ybWF0cy5cbmNvbnN0IFNQTElUX0xPV0VSX1VQUEVSX1JFID0gLyhbXFxwe0xsfVxcZF0pKFxccHtMdX0pL2d1O1xuY29uc3QgU1BMSVRfVVBQRVJfVVBQRVJfUkUgPSAvKFxccHtMdX0pKFtcXHB7THV9XVtcXHB7TGx9XSkvZ3U7XG4vLyBVc2VkIHRvIGl0ZXJhdGUgb3ZlciB0aGUgaW5pdGlhbCBzcGxpdCByZXN1bHQgYW5kIHNlcGFyYXRlIG51bWJlcnMuXG5jb25zdCBTUExJVF9TRVBBUkFURV9OVU1CRVJfUkUgPSAvKFxcZClcXHB7TGx9fChcXHB7TH0pXFxkL3U7XG4vLyBSZWdleHAgaW52b2x2ZWQgd2l0aCBzdHJpcHBpbmcgbm9uLXdvcmQgY2hhcmFjdGVycyBmcm9tIHRoZSByZXN1bHQuXG5jb25zdCBERUZBVUxUX1NUUklQX1JFR0VYUCA9IC9bXlxccHtMfVxcZF0rL2dpdTtcbi8vIFRoZSByZXBsYWNlbWVudCB2YWx1ZSBmb3Igc3BsaXRzLlxuY29uc3QgU1BMSVRfUkVQTEFDRV9WQUxVRSA9IFwiJDFcXDAkMlwiO1xuLy8gVGhlIGRlZmF1bHQgY2hhcmFjdGVycyB0byBrZWVwIGFmdGVyIHRyYW5zZm9ybWluZyBjYXNlLlxuY29uc3QgREVGQVVMVF9QUkVGSVhfU1VGRklYX0NIQVJBQ1RFUlMgPSBcIlwiO1xuLyoqXG4gKiBTcGxpdCBhbnkgY2FzZWQgaW5wdXQgc3RyaW5ncyBpbnRvIGFuIGFycmF5IG9mIHdvcmRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3BsaXQodmFsdWUpIHtcbiAgICBsZXQgcmVzdWx0ID0gdmFsdWUudHJpbSgpO1xuICAgIHJlc3VsdCA9IHJlc3VsdFxuICAgICAgICAucmVwbGFjZShTUExJVF9MT1dFUl9VUFBFUl9SRSwgU1BMSVRfUkVQTEFDRV9WQUxVRSlcbiAgICAgICAgLnJlcGxhY2UoU1BMSVRfVVBQRVJfVVBQRVJfUkUsIFNQTElUX1JFUExBQ0VfVkFMVUUpO1xuICAgIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKERFRkFVTFRfU1RSSVBfUkVHRVhQLCBcIlxcMFwiKTtcbiAgICBsZXQgc3RhcnQgPSAwO1xuICAgIGxldCBlbmQgPSByZXN1bHQubGVuZ3RoO1xuICAgIC8vIFRyaW0gdGhlIGRlbGltaXRlciBmcm9tIGFyb3VuZCB0aGUgb3V0cHV0IHN0cmluZy5cbiAgICB3aGlsZSAocmVzdWx0LmNoYXJBdChzdGFydCkgPT09IFwiXFwwXCIpXG4gICAgICAgIHN0YXJ0Kys7XG4gICAgaWYgKHN0YXJ0ID09PSBlbmQpXG4gICAgICAgIHJldHVybiBbXTtcbiAgICB3aGlsZSAocmVzdWx0LmNoYXJBdChlbmQgLSAxKSA9PT0gXCJcXDBcIilcbiAgICAgICAgZW5kLS07XG4gICAgcmV0dXJuIHJlc3VsdC5zbGljZShzdGFydCwgZW5kKS5zcGxpdCgvXFwwL2cpO1xufVxuLyoqXG4gKiBTcGxpdCB0aGUgaW5wdXQgc3RyaW5nIGludG8gYW4gYXJyYXkgb2Ygd29yZHMsIHNlcGFyYXRpbmcgbnVtYmVycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNwbGl0U2VwYXJhdGVOdW1iZXJzKHZhbHVlKSB7XG4gICAgY29uc3Qgd29yZHMgPSBzcGxpdCh2YWx1ZSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB3b3JkID0gd29yZHNbaV07XG4gICAgICAgIGNvbnN0IG1hdGNoID0gU1BMSVRfU0VQQVJBVEVfTlVNQkVSX1JFLmV4ZWMod29yZCk7XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gbWF0Y2guaW5kZXggKyAobWF0Y2hbMV0gPz8gbWF0Y2hbMl0pLmxlbmd0aDtcbiAgICAgICAgICAgIHdvcmRzLnNwbGljZShpLCAxLCB3b3JkLnNsaWNlKDAsIG9mZnNldCksIHdvcmQuc2xpY2Uob2Zmc2V0KSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHdvcmRzO1xufVxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIHRvIHNwYWNlIHNlcGFyYXRlZCBsb3dlciBjYXNlIChgZm9vIGJhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9DYXNlKGlucHV0LCBvcHRpb25zKSB7XG4gICAgY29uc3QgW3ByZWZpeCwgd29yZHMsIHN1ZmZpeF0gPSBzcGxpdFByZWZpeFN1ZmZpeChpbnB1dCwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIChwcmVmaXggK1xuICAgICAgICB3b3Jkcy5tYXAobG93ZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSkpLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiIFwiKSArXG4gICAgICAgIHN1ZmZpeCk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8gY2FtZWwgY2FzZSAoYGZvb0JhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FtZWxDYXNlKGlucHV0LCBvcHRpb25zKSB7XG4gICAgY29uc3QgW3ByZWZpeCwgd29yZHMsIHN1ZmZpeF0gPSBzcGxpdFByZWZpeFN1ZmZpeChpbnB1dCwgb3B0aW9ucyk7XG4gICAgY29uc3QgbG93ZXIgPSBsb3dlckZhY3Rvcnkob3B0aW9ucz8ubG9jYWxlKTtcbiAgICBjb25zdCB1cHBlciA9IHVwcGVyRmFjdG9yeShvcHRpb25zPy5sb2NhbGUpO1xuICAgIGNvbnN0IHRyYW5zZm9ybSA9IG9wdGlvbnM/Lm1lcmdlQW1iaWd1b3VzQ2hhcmFjdGVyc1xuICAgICAgICA/IGNhcGl0YWxDYXNlVHJhbnNmb3JtRmFjdG9yeShsb3dlciwgdXBwZXIpXG4gICAgICAgIDogcGFzY2FsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKTtcbiAgICByZXR1cm4gKHByZWZpeCArXG4gICAgICAgIHdvcmRzXG4gICAgICAgICAgICAubWFwKCh3b3JkLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBsb3dlcih3b3JkKTtcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm0od29yZCwgaW5kZXgpO1xuICAgICAgICB9KVxuICAgICAgICAgICAgLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiXCIpICtcbiAgICAgICAgc3VmZml4KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBwYXNjYWwgY2FzZSAoYEZvb0JhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFzY2FsQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIGNvbnN0IFtwcmVmaXgsIHdvcmRzLCBzdWZmaXhdID0gc3BsaXRQcmVmaXhTdWZmaXgoaW5wdXQsIG9wdGlvbnMpO1xuICAgIGNvbnN0IGxvd2VyID0gbG93ZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSk7XG4gICAgY29uc3QgdXBwZXIgPSB1cHBlckZhY3Rvcnkob3B0aW9ucz8ubG9jYWxlKTtcbiAgICBjb25zdCB0cmFuc2Zvcm0gPSBvcHRpb25zPy5tZXJnZUFtYmlndW91c0NoYXJhY3RlcnNcbiAgICAgICAgPyBjYXBpdGFsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKVxuICAgICAgICA6IHBhc2NhbENhc2VUcmFuc2Zvcm1GYWN0b3J5KGxvd2VyLCB1cHBlcik7XG4gICAgcmV0dXJuIHByZWZpeCArIHdvcmRzLm1hcCh0cmFuc2Zvcm0pLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiXCIpICsgc3VmZml4O1xufVxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIHRvIHBhc2NhbCBzbmFrZSBjYXNlIChgRm9vX0JhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFzY2FsU25ha2VDYXNlKGlucHV0LCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGNhcGl0YWxDYXNlKGlucHV0LCB7IGRlbGltaXRlcjogXCJfXCIsIC4uLm9wdGlvbnMgfSk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8gY2FwaXRhbCBjYXNlIChgRm9vIEJhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FwaXRhbENhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBbcHJlZml4LCB3b3Jkcywgc3VmZml4XSA9IHNwbGl0UHJlZml4U3VmZml4KGlucHV0LCBvcHRpb25zKTtcbiAgICBjb25zdCBsb3dlciA9IGxvd2VyRmFjdG9yeShvcHRpb25zPy5sb2NhbGUpO1xuICAgIGNvbnN0IHVwcGVyID0gdXBwZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSk7XG4gICAgcmV0dXJuIChwcmVmaXggK1xuICAgICAgICB3b3Jkc1xuICAgICAgICAgICAgLm1hcChjYXBpdGFsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKSlcbiAgICAgICAgICAgIC5qb2luKG9wdGlvbnM/LmRlbGltaXRlciA/PyBcIiBcIikgK1xuICAgICAgICBzdWZmaXgpO1xufVxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIHRvIGNvbnN0YW50IGNhc2UgKGBGT09fQkFSYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25zdGFudENhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBbcHJlZml4LCB3b3Jkcywgc3VmZml4XSA9IHNwbGl0UHJlZml4U3VmZml4KGlucHV0LCBvcHRpb25zKTtcbiAgICByZXR1cm4gKHByZWZpeCArXG4gICAgICAgIHdvcmRzLm1hcCh1cHBlckZhY3Rvcnkob3B0aW9ucz8ubG9jYWxlKSkuam9pbihvcHRpb25zPy5kZWxpbWl0ZXIgPz8gXCJfXCIpICtcbiAgICAgICAgc3VmZml4KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBkb3QgY2FzZSAoYGZvby5iYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRvdENhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbm9DYXNlKGlucHV0LCB7IGRlbGltaXRlcjogXCIuXCIsIC4uLm9wdGlvbnMgfSk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8ga2ViYWIgY2FzZSAoYGZvby1iYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGtlYmFiQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBub0Nhc2UoaW5wdXQsIHsgZGVsaW1pdGVyOiBcIi1cIiwgLi4ub3B0aW9ucyB9KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBwYXRoIGNhc2UgKGBmb28vYmFyYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXRoQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBub0Nhc2UoaW5wdXQsIHsgZGVsaW1pdGVyOiBcIi9cIiwgLi4ub3B0aW9ucyB9KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBwYXRoIGNhc2UgKGBGb28gYmFyYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZW50ZW5jZUNhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBbcHJlZml4LCB3b3Jkcywgc3VmZml4XSA9IHNwbGl0UHJlZml4U3VmZml4KGlucHV0LCBvcHRpb25zKTtcbiAgICBjb25zdCBsb3dlciA9IGxvd2VyRmFjdG9yeShvcHRpb25zPy5sb2NhbGUpO1xuICAgIGNvbnN0IHVwcGVyID0gdXBwZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSk7XG4gICAgY29uc3QgdHJhbnNmb3JtID0gY2FwaXRhbENhc2VUcmFuc2Zvcm1GYWN0b3J5KGxvd2VyLCB1cHBlcik7XG4gICAgcmV0dXJuIChwcmVmaXggK1xuICAgICAgICB3b3Jkc1xuICAgICAgICAgICAgLm1hcCgod29yZCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNmb3JtKHdvcmQpO1xuICAgICAgICAgICAgcmV0dXJuIGxvd2VyKHdvcmQpO1xuICAgICAgICB9KVxuICAgICAgICAgICAgLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiIFwiKSArXG4gICAgICAgIHN1ZmZpeCk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8gc25ha2UgY2FzZSAoYGZvb19iYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNuYWtlQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBub0Nhc2UoaW5wdXQsIHsgZGVsaW1pdGVyOiBcIl9cIiwgLi4ub3B0aW9ucyB9KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBoZWFkZXIgY2FzZSAoYEZvby1CYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYWluQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBjYXBpdGFsQ2FzZShpbnB1dCwgeyBkZWxpbWl0ZXI6IFwiLVwiLCAuLi5vcHRpb25zIH0pO1xufVxuZnVuY3Rpb24gbG93ZXJGYWN0b3J5KGxvY2FsZSkge1xuICAgIHJldHVybiBsb2NhbGUgPT09IGZhbHNlXG4gICAgICAgID8gKGlucHV0KSA9PiBpbnB1dC50b0xvd2VyQ2FzZSgpXG4gICAgICAgIDogKGlucHV0KSA9PiBpbnB1dC50b0xvY2FsZUxvd2VyQ2FzZShsb2NhbGUpO1xufVxuZnVuY3Rpb24gdXBwZXJGYWN0b3J5KGxvY2FsZSkge1xuICAgIHJldHVybiBsb2NhbGUgPT09IGZhbHNlXG4gICAgICAgID8gKGlucHV0KSA9PiBpbnB1dC50b1VwcGVyQ2FzZSgpXG4gICAgICAgIDogKGlucHV0KSA9PiBpbnB1dC50b0xvY2FsZVVwcGVyQ2FzZShsb2NhbGUpO1xufVxuZnVuY3Rpb24gY2FwaXRhbENhc2VUcmFuc2Zvcm1GYWN0b3J5KGxvd2VyLCB1cHBlcikge1xuICAgIHJldHVybiAod29yZCkgPT4gYCR7dXBwZXIod29yZFswXSl9JHtsb3dlcih3b3JkLnNsaWNlKDEpKX1gO1xufVxuZnVuY3Rpb24gcGFzY2FsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKSB7XG4gICAgcmV0dXJuICh3b3JkLCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBjaGFyMCA9IHdvcmRbMF07XG4gICAgICAgIGNvbnN0IGluaXRpYWwgPSBpbmRleCA+IDAgJiYgY2hhcjAgPj0gXCIwXCIgJiYgY2hhcjAgPD0gXCI5XCIgPyBcIl9cIiArIGNoYXIwIDogdXBwZXIoY2hhcjApO1xuICAgICAgICByZXR1cm4gaW5pdGlhbCArIGxvd2VyKHdvcmQuc2xpY2UoMSkpO1xuICAgIH07XG59XG5mdW5jdGlvbiBzcGxpdFByZWZpeFN1ZmZpeChpbnB1dCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgc3BsaXRGbiA9IG9wdGlvbnMuc3BsaXQgPz8gKG9wdGlvbnMuc2VwYXJhdGVOdW1iZXJzID8gc3BsaXRTZXBhcmF0ZU51bWJlcnMgOiBzcGxpdCk7XG4gICAgY29uc3QgcHJlZml4Q2hhcmFjdGVycyA9IG9wdGlvbnMucHJlZml4Q2hhcmFjdGVycyA/PyBERUZBVUxUX1BSRUZJWF9TVUZGSVhfQ0hBUkFDVEVSUztcbiAgICBjb25zdCBzdWZmaXhDaGFyYWN0ZXJzID0gb3B0aW9ucy5zdWZmaXhDaGFyYWN0ZXJzID8/IERFRkFVTFRfUFJFRklYX1NVRkZJWF9DSEFSQUNURVJTO1xuICAgIGxldCBwcmVmaXhJbmRleCA9IDA7XG4gICAgbGV0IHN1ZmZpeEluZGV4ID0gaW5wdXQubGVuZ3RoO1xuICAgIHdoaWxlIChwcmVmaXhJbmRleCA8IGlucHV0Lmxlbmd0aCkge1xuICAgICAgICBjb25zdCBjaGFyID0gaW5wdXQuY2hhckF0KHByZWZpeEluZGV4KTtcbiAgICAgICAgaWYgKCFwcmVmaXhDaGFyYWN0ZXJzLmluY2x1ZGVzKGNoYXIpKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIHByZWZpeEluZGV4Kys7XG4gICAgfVxuICAgIHdoaWxlIChzdWZmaXhJbmRleCA+IHByZWZpeEluZGV4KSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gc3VmZml4SW5kZXggLSAxO1xuICAgICAgICBjb25zdCBjaGFyID0gaW5wdXQuY2hhckF0KGluZGV4KTtcbiAgICAgICAgaWYgKCFzdWZmaXhDaGFyYWN0ZXJzLmluY2x1ZGVzKGNoYXIpKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIHN1ZmZpeEluZGV4ID0gaW5kZXg7XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICAgIGlucHV0LnNsaWNlKDAsIHByZWZpeEluZGV4KSxcbiAgICAgICAgc3BsaXRGbihpbnB1dC5zbGljZShwcmVmaXhJbmRleCwgc3VmZml4SW5kZXgpKSxcbiAgICAgICAgaW5wdXQuc2xpY2Uoc3VmZml4SW5kZXgpLFxuICAgIF07XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLAogICAgImltcG9ydCB0eXBlIHsgQ2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGUgfSBmcm9tICdAY2xvdWRmb3JtL3Jlc291cmNlLXR5cGVzJztcbmltcG9ydCB7IHBhc2NhbENhc2UgfSBmcm9tICdjaGFuZ2UtY2FzZSc7XG5cbmV4cG9ydCBjb25zdCBjZkxvZ2ljYWxOYW1lcyA9IHtcbiAgYnVja2V0KHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhc2NhbENhc2UoYCR7c3RwUmVzb3VyY2VOYW1lfS1idWNrZXRgKTtcbiAgfSxcbiAgYXRsYXNNb25nb1Byb2plY3QoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0F0bGFzTW9uZ28nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpQcm9qZWN0JyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29DcmVkZW50aWFsc1Byb3ZpZGVyKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBdGxhc01vbmdvQ3JlZGVudGlhbHNQcm92aWRlcicgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29Qcm9qZWN0VnBjTmV0d29ya0NvbnRhaW5lcigpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQXRsYXNNb25nbycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ01vbmdvREI6OlN0cEF0bGFzVjE6Ok5ldHdvcmtDb250YWluZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgYXRsYXNNb25nb1Byb2plY3RWcGNOZXR3b3JrUGVlcmluZygpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQXRsYXNNb25nbycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ01vbmdvREI6OlN0cEF0bGFzVjE6Ok5ldHdvcmtQZWVyaW5nJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29Qcm9qZWN0SXBBY2Nlc3NMaXN0KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBdGxhc01vbmdvJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6UHJvamVjdElwQWNjZXNzTGlzdCcgfVxuICAgIH0pO1xuICB9LFxuICBhdGxhc01vbmdvVXNlckFzc29jaWF0ZWRXaXRoUm9sZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBdGxhc01vbmdvJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6RGF0YWJhc2VVc2VyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29DbHVzdGVyTWFzdGVyVXNlcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6RGF0YWJhc2VVc2VyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29DbHVzdGVyKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpDbHVzdGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzUmVwbGljYXRpb25Hcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGlDYWNoZTo6UmVwbGljYXRpb25Hcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICByZWRpc0xvZ0dyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzUGFyYW1ldGVyR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpQ2FjaGU6OlBhcmFtZXRlckdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzU3VibmV0R3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpQ2FjaGU6OlN1Ym5ldEdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWZzRmlsZXN5c3RlbShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7XG4gICAgICAgIGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFRlM6OkZpbGVTeXN0ZW0nXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGVmc0FjY2Vzc1BvaW50KHtcbiAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgZWZzRmlsZXN5c3RlbU5hbWUsXG4gICAgcm9vdERpcmVjdG9yeVxuICB9OiB7XG4gICAgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmc7XG4gICAgZWZzRmlsZXN5c3RlbU5hbWU6IHN0cmluZztcbiAgICByb290RGlyZWN0b3J5Pzogc3RyaW5nO1xuICB9KSB7XG4gICAgLy8gQ3JlYXRlIGEgdW5pcXVlIGlkZW50aWZpZXIgYmFzZWQgb24gdGhlIHJvb3QgZGlyZWN0b3J5XG4gICAgY29uc3Qgcm9vdERpcklkZW50aWZpZXIgPSByb290RGlyZWN0b3J5ID8gYCR7cm9vdERpcmVjdG9yeS5yZXBsYWNlKC9cXC8vZywgJy0nKS5yZXBsYWNlKC9eLXwtJC9nLCAnJyl9YCA6ICdSb290JztcblxuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6IGAke2Vmc0ZpbGVzeXN0ZW1OYW1lfS0ke3Jvb3REaXJJZGVudGlmaWVyfWBcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHtcbiAgICAgICAgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6QWNjZXNzUG9pbnQnXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGVmc01vdW50VGFyZ2V0KHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBtb3VudFRhcmdldEluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU3VibmV0JywgdHlwZUluZGV4OiBtb3VudFRhcmdldEluZGV4IH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6TW91bnRUYXJnZXQnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWZzU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgc25zUm9sZVNlbmRTbXNGcm9tQ29nbml0byhzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdTZW5kU21zJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgY2xvdWRmcm9udERpc3RyaWJ1dGlvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZGlzdHJpYnV0aW9uSW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdDRE4nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsIGluZGV4OiBkaXN0cmlidXRpb25JbmRleCB9XG4gICAgfSk7XG4gIH0sXG4gIGNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgY2FjaGluZ09wdGlvbnNIYXNoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgQ0ROQ2FjaGVCZWhhdmlvciR7Y2FjaGluZ09wdGlvbnNIYXNofWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knIH1cbiAgICB9KTtcbiAgfSxcbiAgY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSh0eXBlOiAnRGVmRHluYW1pYycgfCAnRGVmU3RhdGljJykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGBDRE4ke3R5cGV9YCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBjbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZm9yd2FyZGluZ09wdGlvbnNIYXNoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgQ0ROQ2FjaGVCZWhhdmlvciR7Zm9yd2FyZGluZ09wdGlvbnNIYXNofWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBjbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3kodHlwZTogJ0RlZkR5bmFtaWMnIHwgJ0RlZlN0YXRpYycpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgQ0ROJHt0eXBlfWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBjbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHkoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQ0ROJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknIH1cbiAgICB9KTtcbiAgfSxcbiAgb3Blbk5leHRIb3N0SGVhZGVyUmV3cml0ZUZ1bmN0aW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ09wZW5OZXh0SG9zdEhlYWRlclJld3JpdGUnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkZ1bmN0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIHNzcldlYkhvc3RIZWFkZXJSZXdyaXRlRnVuY3Rpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIHJlc291cmNlVHlwZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYCR7cmVzb3VyY2VUeXBlLnJlcGxhY2UoLy0vZywgJycpfUhvc3RIZWFkZXJSZXdyaXRlYCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpGdW5jdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBvcGVuTmV4dEFzc2V0UmVwbGFjZXJDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBc3NldFJlcGxhY2VyJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgb3Blbk5leHREeW5hbW9JbnNlcnRDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdEeW5hbW9JbnNlcnQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBkbnNSZWNvcmQoZnVsbHlRdWFsaWZpZWREb21haW5OYW1lOiBzdHJpbmcpIHtcbiAgICAvLyB3ZSBkbyBub3QgYnVpbGQgYnVpbGQgdGhlIHJlc291cmNlIG5hbWUgY29udmVudGlvbmFsbHkgdGhyb3VnaCBzdHBSZXNvdXJjZU5hbWVcbiAgICAvLyB0aGlzIGlzIGR1ZSB0byB1cGRhdGUgYmVoYXZpb3JzIG9mIENsb3VkZm9ybWF0aW9uXG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6ICcnLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGdldFNwZWNpZmllckZvckRvbWFpblJlc291cmNlKGZ1bGx5UXVhbGlmaWVkRG9tYWluTmFtZSkgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JyB9XG4gICAgfSk7XG4gIH0sXG4gIGR5bmFtb0dsb2JhbFRhYmxlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkR5bmFtb0RCOjpHbG9iYWxUYWJsZScgfVxuICAgIH0pO1xuICB9LFxuICBkeW5hbW9SZWdpb25hbFRhYmxlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkR5bmFtb0RCOjpUYWJsZScgfVxuICAgIH0pO1xuICB9LFxuICBidWNrZXRQb2xpY3koc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBldmVudE9uRGVsaXZlcnlGYWlsdXJlU3FzUXVldWVQb2xpY3koc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZVBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBzbnNFdmVudFN1YnNjcmlwdGlvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0V2ZW50JyxcbiAgICAgICAgdHlwZUluZGV4OiBldmVudEluZGV4XG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTTlM6OlN1YnNjcmlwdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBzbnNFdmVudFBlcm1pc3Npb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjclJlcG8oKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0NvbnRhaW5lcidcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDUjo6UmVwb3NpdG9yeScgfVxuICAgIH0pO1xuICB9LFxuICBkZXBsb3ltZW50QnVja2V0KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdEZXBsb3ltZW50J1xuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfVxuICAgIH0pO1xuICB9LFxuICBkZXBsb3ltZW50QnVja2V0UG9saWN5KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdEZXBsb3ltZW50J1xuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFJbnZva2VDb25maWcoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpFdmVudEludm9rZUNvbmZpZycgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFWZXJzaW9uUHVibGlzaGVyQ3VzdG9tUmVzb3VyY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnVmVyc2lvbicgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGNvZGVEZXBsb3lTZXJ2aWNlUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnQ29kZURlcGxveSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaEluc3RhbmNlUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnQmF0Y2hJbnN0YW5jZSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaEluc3RhbmNlRGVmYXVsdFNlY3VyaXR5R3JvdXAoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0JhdGNoSW5zdGFuY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hJbnN0YW5jZVByb2ZpbGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0JhdGNoSW5zdGFuY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaEluc3RhbmNlTGF1bmNoVGVtcGxhdGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0JhdGNoSW5zdGFuY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkxhdW5jaFRlbXBsYXRlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhdGNoU3RhdGVNYWNoaW5lRXhlY3V0aW9uUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnQmF0Y2hTdGF0ZU1hY2hpbmUnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hTcG90RmxlZXRSb2xlKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdCYXRjaFNwb3RGbGVldCdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaFNlcnZpY2VSb2xlKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdCYXRjaFNlcnZpY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hKb2JFeGVjdXRpb25Sb2xlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaENvbXB1dGVFbnZpcm9ubWVudChzcG90OiBib29sZWFuLCBncHU6IGJvb2xlYW4pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiBgQmF0Y2gtJHtzcG90ID8gJ3Nwb3QnIDogJ29uRGVtYW5kJ30tJHtncHUgPyAnZ3B1JyA6ICcnfWBcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkJhdGNoOjpDb21wdXRlRW52aXJvbm1lbnQnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hKb2JRdWV1ZShzcG90OiBib29sZWFuLCBncHU6IGJvb2xlYW4pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiBgQmF0Y2gtJHtzcG90ID8gJ3Nwb3QnIDogJ29uRGVtYW5kJ30tJHtncHUgPyAnZ3B1JyA6ICcnfWBcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkJhdGNoOjpKb2JRdWV1ZScgfVxuICAgIH0pO1xuICB9LFxuICBzdWJuZXQocHVibGljU3VibmV0OiBib29sZWFuLCBzdWJuZXRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogcHVibGljU3VibmV0ID8gJ1B1YmxpYycgOiAnUHJpdmF0ZSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U3VibmV0JywgaW5kZXg6IHN1Ym5ldEluZGV4IH1cbiAgICB9KTtcbiAgfSxcbiAgdnBjKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlZQQycgfVxuICAgIH0pO1xuICB9LFxuICB2cGNHYXRld2F5RW5kcG9pbnQodHlwZTogJ3MzJyB8ICdkeW5hbW8tZGInKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYCR7dHlwZX0tR2F0ZXdheWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpWUENFbmRwb2ludCcgfVxuICAgIH0pO1xuICB9LFxuICBkYlN1Ym5ldEdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJTdWJuZXRHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBhdXJvcmFEYkNsdXN0ZXIoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQkNsdXN0ZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgYXVyb3JhRGJDbHVzdGVyUGFyYW1ldGVyR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQkNsdXN0ZXJQYXJhbWV0ZXJHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBhdXJvcmFEYkNsdXN0ZXJMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgbG9nR3JvdXBUeXBlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQ2x1c3RlcicsIHN1YnR5cGU6IGxvZ0dyb3VwVHlwZSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBkYlNlY3VyaXR5R3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGRiSW5zdGFuY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQkluc3RhbmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGRiSW5zdGFuY2VMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgbG9nR3JvdXBUeXBlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnSW5zdGFuY2UnLCBzdWJ0eXBlOiBsb2dHcm91cFR5cGUgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgb3BlblNlYXJjaERvbWFpbkxvZ0dyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBsb2dHcm91cFR5cGU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdJbnN0YW5jZScsIHN1YnR5cGU6IGxvZ0dyb3VwVHlwZSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBkYk9wdGlvbkdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6T3B0aW9uR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZGJJbnN0YW5jZVBhcmFtZXRlckdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJQYXJhbWV0ZXJHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBkYlJlcGxpY2Eoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIHJlcGxpY2FOdW06IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdSZXBsaWNhJywgdHlwZUluZGV4OiByZXBsaWNhTnVtIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJJbnN0YW5jZScgfVxuICAgIH0pO1xuICB9LFxuICBkYlJlcGxpY2FMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgbG9nR3JvdXBUeXBlOiBzdHJpbmcsIHJlcGxpY2FOdW06IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdSZXBsaWNhJywgdHlwZUluZGV4OiByZXBsaWNhTnVtLCBzdWJ0eXBlOiBsb2dHcm91cFR5cGUgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZGJSZXBsaWNhUGFyYW1ldGVyR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIHJlcGxpY2FOdW06IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdSZXBsaWNhJywgdHlwZUluZGV4OiByZXBsaWNhTnVtIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJQYXJhbWV0ZXJHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBhdXJvcmFEYkluc3RhbmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBpbnN0YW5jZU51bTogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJJbnN0YW5jZScsIGluZGV4OiBpbnN0YW5jZU51bSB9XG4gICAgfSk7XG4gIH0sXG4gIGF1cm9yYURiSW5zdGFuY2VQYXJhbWV0ZXJHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdJbnN0YW5jZScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQlBhcmFtZXRlckdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGV2ZW50QnVzUnVsZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0V2ZW50JyxcbiAgICAgICAgdHlwZUluZGV4OiBldmVudEluZGV4XG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFdmVudHM6OlJ1bGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgY3VzdG9tVGFnZ2luZ1NjaGVkdWxlUnVsZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU3RwQ3VzdG9tVGFnZ2luZ1NjaGVkdWxlJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFdmVudHM6OlJ1bGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgY3VzdG9tVGFnZ2luZ1NjaGVkdWxlUnVsZVBlcm1pc3Npb24oKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1N0cEN1c3RvbVRhZ2dpbmdTY2hlZHVsZVJ1bGUnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicgfVxuICAgIH0pO1xuICB9LFxuICBjbG91ZFdhdGNoTG9nRXZlbnRTdWJzY3JpcHRpb25GaWx0ZXIoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6U3Vic2NyaXB0aW9uRmlsdGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGV2ZW50U291cmNlTWFwcGluZyhzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0V2ZW50JyxcbiAgICAgICAgdHlwZUluZGV4OiBldmVudEluZGV4XG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkV2ZW50U291cmNlTWFwcGluZycgfVxuICAgIH0pO1xuICB9LFxuICBpb3RFdmVudFRvcGljUnVsZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0V2ZW50JyxcbiAgICAgICAgdHlwZUluZGV4OiBldmVudEluZGV4XG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJb1Q6OlRvcGljUnVsZScgfVxuICAgIH0pO1xuICB9LFxuICBraW5lc2lzRXZlbnRDb25zdW1lcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0V2ZW50JyxcbiAgICAgICAgdHlwZUluZGV4OiBldmVudEluZGV4XG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpLaW5lc2lzOjpTdHJlYW1Db25zdW1lcicgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGEoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGlzU3RwU2VydmljZUZ1bmN0aW9uPzogYm9vbGVhbikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiBpc1N0cFNlcnZpY2VGdW5jdGlvbiA/IHsgdHlwZTogJ0N1c3RvbVJlc291cmNlJyB9IDogdW5kZWZpbmVkLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxhbWJkYVN0cEFsaWFzKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ1N0cCdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6QWxpYXMnIH1cbiAgICB9KTtcbiAgfSxcbiAgbGFtYmRhVXJsKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6VXJsJyB9XG4gICAgfSk7XG4gIH0sXG4gIGNvZGVEZXBsb3lEZXBsb3ltZW50R3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6RGVwbG95bWVudEdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVJlc291cmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBzY3JpcHRDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdTY3JpcHQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaFN0YXRlTWFjaGluZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdKb2JFeGVjdXRpb24nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaEpvYkRlZmluaXRpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QmF0Y2g6OkpvYkRlZmluaXRpb24nIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hKb2JMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBnbG9iYWxTdGF0ZU1hY2hpbmVzUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnR2xvYmFsU3RhdGVNYWNoaW5lJ1xuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9XG4gICAgfSk7XG4gIH0sXG4gIHN0YXRlTWFjaGluZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnIH1cbiAgICB9KTtcbiAgfSxcbiAgaW50ZXJuZXRHYXRld2F5KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkludGVybmV0R2F0ZXdheScgfVxuICAgIH0pO1xuICB9LFxuICB2cGNHYXRld2F5QXR0YWNobWVudCgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpWUENHYXRld2F5QXR0YWNobWVudCcgfVxuICAgIH0pO1xuICB9LFxuICByb3V0ZVRhYmxlKHB1YmxpY1N1Ym5ldDogYm9vbGVhbiwgc3VibmV0SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IHB1YmxpY1N1Ym5ldCA/ICdQdWJsaWNTdWJuZXQnIDogJ1ByaXZhdGVTdWJuZXQnLCB0eXBlSW5kZXg6IHN1Ym5ldEluZGV4IH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6Um91dGVUYWJsZScgfVxuICAgIH0pO1xuICB9LFxuICBpbnRlcm5ldEdhdGV3YXlSb3V0ZShzdWJuZXRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0ludGVybmV0R2F0ZXdheScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpSb3V0ZScsIGluZGV4OiBzdWJuZXRJbmRleCB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29WcGNSb3V0ZShwdWJsaWNTdWJuZXRUYWJsZTogYm9vbGVhbiwgc3VibmV0SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGBBdGxhc01vbmdvJHtwdWJsaWNTdWJuZXRUYWJsZSA/ICdQdWJsaWNTdWJuZXQnIDogJ1ByaXZhdGVTdWJuZXQnfWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpSb3V0ZScsIGluZGV4OiBzdWJuZXRJbmRleCB9XG4gICAgfSk7XG4gIH0sXG4gIHJvdXRlVGFibGVUb1N1Ym5ldEFzc29jaWF0aW9uKHB1YmxpY1N1Ym5ldDogYm9vbGVhbiwgc3VibmV0SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IHB1YmxpY1N1Ym5ldCA/ICdQdWJsaWNTdWJuZXQnIDogJ1ByaXZhdGVTdWJuZXQnLCB0eXBlSW5kZXg6IHN1Ym5ldEluZGV4IH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U3VibmV0Um91dGVUYWJsZUFzc29jaWF0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIG5hdEdhdGV3YXkoYXpJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TmF0R2F0ZXdheScsIGluZGV4OiBhekluZGV4IH1cbiAgICB9KTtcbiAgfSxcbiAgbmF0RWxhc3RpY0lwKGF6SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdOYXQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6RUlQJywgaW5kZXg6IGF6SW5kZXggfVxuICAgIH0pO1xuICB9LFxuICBuYXRSb3V0ZShzdWJuZXRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ05hdFByaXZhdGVTdWJuZXQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6Um91dGUnLCBpbmRleDogc3VibmV0SW5kZXggfVxuICAgIH0pO1xuICB9LFxuICBldmVudEJ1cyhzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFdmVudHM6OkV2ZW50QnVzJyB9XG4gICAgfSk7XG4gIH0sXG4gIGV2ZW50QnVzQXJjaGl2ZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFdmVudHM6OkFyY2hpdmUnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzQ2x1c3RlcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNsdXN0ZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzVGFza0RlZmluaXRpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBlY3NTZXJ2aWNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBibHVlR3JlZW46IGJvb2xlYW4pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogYmx1ZUdyZWVuID8geyB0eXBlOiAnQmx1ZUdyZWVuJyB9IDogdW5kZWZpbmVkLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OlNlcnZpY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRXhlY3V0aW9uUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRWNzRXhlY3V0aW9uJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRWMySW5zdGFuY2VSb2xlKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFY3NJbnN0YW5jZSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBlY3NFYzJBdXRvc2NhbGluZ0dyb3VwV2FybVBvb2woc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6Oldhcm1Qb29sJyB9XG4gICAgfSk7XG4gIH0sXG4gIGV2ZW50QnVzUm9sZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaCgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgc2NoZWR1bGVyUnVsZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdTY2hlZHVsZWRJbnN0YW5jZVJlZnJlc2gnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkV2ZW50czo6UnVsZScgfVxuICAgIH0pO1xuICB9LFxuICBlY3NFYzJJbnN0YW5jZUxhdW5jaFRlbXBsYXRlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TGF1bmNoVGVtcGxhdGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRWMyQXV0b3NjYWxpbmdHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6QXV0b1NjYWxpbmdHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBlY3NFYzJGb3JjZURlbGV0ZUF1dG9zY2FsaW5nR3JvdXBDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdGb3JjZURlbGV0ZUFzZycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc0Rpc2FibGVNYW5hZ2VkVGVybWluYXRpb25Qcm90ZWN0aW9uQ3VzdG9tUmVzb3VyY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRGlzYWJsZU1hbmFnZWRUZXJtaW5hdGlvblByb3RlY3Rpb24nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBlY3NEZXJlZ2lzdGVyVGFyZ2V0c0N1c3RvbVJlc291cmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0RlcmVnaXN0ZXJUYXJnZXRzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcblxuICBlY3NFYzJDYXBhY2l0eVByb3ZpZGVyKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2FwYWNpdHlQcm92aWRlcicgfVxuICAgIH0pO1xuICB9LFxuICBlY3NFYzJDYXBhY2l0eVByb3ZpZGVyQXNzb2NpYXRpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDbHVzdGVyQ2FwYWNpdHlQcm92aWRlckFzc29jaWF0aW9ucycgfVxuICAgIH0pO1xuICB9LFxuICBlY3NFYzJJbnN0YW5jZVByb2ZpbGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0Vjc0luc3RhbmNlJ1xuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpJbnN0YW5jZVByb2ZpbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzVGFza1JvbGUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc0F1dG9TY2FsaW5nUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRWNzQXV0b1NjYWxlJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gZWNzU2NoZWR1bGVkTWFpbnRlbmFuY2VFdmVudEJ1c1J1bGUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgLy8gICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgLy8gICAgIHN0cFJlc291cmNlTmFtZSxcbiAgLy8gICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU2NoZWR1bGVkTWFpbnRlbmFuY2UnIH0sXG4gIC8vICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkV2ZW50czo6UnVsZScgfVxuICAvLyAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIC8vIH0sXG4gIGVjc1NjaGVkdWxlZE1haW50ZW5hbmNlTGFtYmRhUGVybWlzc2lvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdTY2hlZHVsZWRNYWludGVuYW5jZScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSkucmVwbGFjZUFsbCgnXycsICcnKTtcbiAgfSxcbiAgYmFzdGlvbkVjMkxhdW5jaFRlbXBsYXRlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TGF1bmNoVGVtcGxhdGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmFzdGlvbkVjMkluc3RhbmNlUHJvZmlsZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXN0aW9uRWMyQXV0b3NjYWxpbmdHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6QXV0b1NjYWxpbmdHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBiYXN0aW9uU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmFzdGlvbkN3QWdlbnRTc21Bc3NvY2lhdGlvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdDd0FnZW50JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTU006OkFzc29jaWF0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhc3Rpb25Tc21BZ2VudFNzbUFzc29jaWF0aW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1NzbUFnZW50JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTU006OkFzc29jaWF0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhc3Rpb25Sb2xlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXN0aW9uTG9nR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGxvZ1R5cGU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IHBhc2NhbENhc2UobG9nVHlwZSkgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmFzdGlvbkNsb3Vkd2F0Y2hTc21Eb2N1bWVudCgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQmFzdGlvbkNsb3Vkd2F0Y2hBZ2VudCcgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U1NNOjpEb2N1bWVudCcgfVxuICAgIH0pO1xuICB9LFxuICBzZXJ2aWNlRGlzY292ZXJ5RWNzU2VydmljZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgc2VydmljZVRhcmdldENvbnRhaW5lclBvcnQ6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGBQb3J0JHtzZXJ2aWNlVGFyZ2V0Q29udGFpbmVyUG9ydH1EaXNjb3ZlcnlgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlNlcnZpY2VEaXNjb3Zlcnk6OlNlcnZpY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgd29ya2xvYWRTZWN1cml0eUdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBsb2FkQmFsYW5jZXJTZWN1cml0eUdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0xiJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgdGFyZ2V0R3JvdXAoe1xuICAgIGxvYWRCYWxhbmNlck5hbWUsXG4gICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgIHRhcmdldENvbnRhaW5lclBvcnQsXG4gICAgYmx1ZUdyZWVuXG4gIH06IHtcbiAgICBzdHBSZXNvdXJjZU5hbWU6IHN0cmluZztcbiAgICBsb2FkQmFsYW5jZXJOYW1lOiBzdHJpbmc7XG4gICAgdGFyZ2V0Q29udGFpbmVyUG9ydD86IG51bWJlcjtcbiAgICBibHVlR3JlZW4/OiBib29sZWFuO1xuICB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogYCR7bG9hZEJhbGFuY2VyTmFtZX0ke3RhcmdldENvbnRhaW5lclBvcnQgPyBgVG9Qb3J0JHt0YXJnZXRDb250YWluZXJQb3J0fWAgOiAnJ30ke2JsdWVHcmVlbiA/ICdCRycgOiAnJ31gXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpUYXJnZXRHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFSb2xlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBkZWZhdWx0TGFtYmRhRnVuY3Rpb25Sb2xlKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdMYW1iZGEnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFQZXJtaXNzaW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBldmVudEluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRXZlbnQnLCB0eXBlSW5kZXg6IGV2ZW50SW5kZXggfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxhbWJkYVB1YmxpY1VybFBlcm1pc3Npb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnUHVibGljVXJsJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlBlcm1pc3Npb24nIH1cbiAgICB9KTtcbiAgfSxcbiAgbGFtYmRhSW90RXZlbnRQZXJtaXNzaW9uKHdvcmtsb2FkTmFtZTogc3RyaW5nLCBldmVudEluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gcGFzY2FsQ2FzZShgJHt3b3JrbG9hZE5hbWV9LUV2ZW50JHtldmVudEluZGV4fS1sYW1iZGEtaW90RXZlbnRQZXJtaXNzaW9uYCk7XG4gIH0sXG4gIGxhbWJkYVRhcmdldEdyb3VwUGVybWlzc2lvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgbG9hZEJhbGFuY2VyTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYCR7bG9hZEJhbGFuY2VyTmFtZX1UYXJnZXRHcm91cGAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGkoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpBcGknIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaUxvZ0dyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlMYW1iZGFJbnRlZ3JhdGlvbih7XG4gICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgIHN0cEh0dHBBcGlHYXRld2F5TmFtZVxuICB9OiB7XG4gICAgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmc7XG4gICAgc3RwSHR0cEFwaUdhdGV3YXlOYW1lOiBzdHJpbmc7XG4gIH0pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBzdHBIdHRwQXBpR2F0ZXdheU5hbWUgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpJbnRlZ3JhdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpQ29udGFpbmVyV29ya2xvYWRJbnRlZ3JhdGlvbih7XG4gICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgIHN0cEh0dHBBcGlHYXRld2F5TmFtZSxcbiAgICB0YXJnZXRDb250YWluZXJQb3J0XG4gIH06IHtcbiAgICBzdHBSZXNvdXJjZU5hbWU6IHN0cmluZztcbiAgICB0YXJnZXRDb250YWluZXJQb3J0OiBudW1iZXI7XG4gICAgc3RwSHR0cEFwaUdhdGV3YXlOYW1lOiBzdHJpbmc7XG4gIH0pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgJHtzdHBIdHRwQXBpR2F0ZXdheU5hbWV9VG9Qb3J0JHt0YXJnZXRDb250YWluZXJQb3J0fWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpJbnRlZ3JhdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpQXV0aG9yaXplcih7IG1ldGhvZCwgcGF0aCwgc3RwUmVzb3VyY2VOYW1lIH06IHsgbWV0aG9kOiBIdHRwTWV0aG9kOyBwYXRoOiBzdHJpbmc7IHN0cFJlc291cmNlTmFtZTogc3RyaW5nIH0pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZTogJycsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogYCR7c3RwUmVzb3VyY2VOYW1lfS0ke21ldGhvZCA9PT0gJyonID8gJ0FueScgOiBtZXRob2R9LSR7cGF0aCA9PT0gJyonID8gJ0RlZmF1bHQnIDogcGF0aH1gXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkF1dGhvcml6ZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaVJvdXRlKHsgbWV0aG9kLCBwYXRoLCBzdHBSZXNvdXJjZU5hbWUgfTogeyBtZXRob2Q6IEh0dHBNZXRob2Q7IHBhdGg6IHN0cmluZzsgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcgfSkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lOiAnJyxcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiBgJHtzdHBSZXNvdXJjZU5hbWV9LSR7bWV0aG9kID09PSAnKicgPyAnQW55JyA6IG1ldGhvZH0tJHtwYXRoID09PSAnKicgPyAnRGVmYXVsdCcgOiBwYXRofWBcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6Um91dGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaVZwY0xpbmsoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpWcGNMaW5rJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlWcGNMaW5rU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdWcGNMaW5rJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaUxhbWJkYVBlcm1pc3Npb24oe1xuICAgIHN0cFJlc291cmNlTmFtZU9mTGFtYmRhLFxuICAgIHN0cFJlc291cmNlTmFtZU9mSHR0cEFwaUdhdGV3YXlcbiAgfToge1xuICAgIHN0cFJlc291cmNlTmFtZU9mTGFtYmRhOiBzdHJpbmc7XG4gICAgc3RwUmVzb3VyY2VOYW1lT2ZIdHRwQXBpR2F0ZXdheTogc3RyaW5nO1xuICB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6IHN0cFJlc291cmNlTmFtZU9mTGFtYmRhLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IHN0cFJlc291cmNlTmFtZU9mSHR0cEFwaUdhdGV3YXkgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlTdGFnZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OlN0YWdlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlEb21haW4oZnVsbHlRdWFsaWZpZWREb21haW5OYW1lOiBzdHJpbmcpIHtcbiAgICAvLyB3ZSBkbyBub3QgYnVpbGQgYnVpbGQgdGhlIHJlc291cmNlIG5hbWUgY29udmVudGlvbmFsbHkgdGhyb3VnaCBzdHBSZXNvdXJjZU5hbWVcbiAgICAvLyB0aGlzIGlzIGR1ZSB0byB1cGRhdGUgYmVoYXZpb3JzIG9mIENsb3VkZm9ybWF0aW9uXG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6ICcnLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGdldFNwZWNpZmllckZvckRvbWFpblJlc291cmNlKGZ1bGx5UXVhbGlmaWVkRG9tYWluTmFtZSkgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpEb21haW5OYW1lJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlEZWZhdWx0RG9tYWluKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6RG9tYWluTmFtZScgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpRG9tYWluTWFwcGluZyhmdWxseVF1YWxpZmllZERvbWFpbk5hbWU6IHN0cmluZykge1xuICAgIC8vIHdlIGRvIG5vdCBidWlsZCBidWlsZCB0aGUgcmVzb3VyY2UgbmFtZSBjb252ZW50aW9uYWxseSB0aHJvdWdoIHN0cFJlc291cmNlTmFtZVxuICAgIC8vIHRoaXMgaXMgZHVlIHRvIHVwZGF0ZSBiZWhhdmlvcnMgb2YgQ2xvdWRmb3JtYXRpb25cbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZTogJycsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogZ2V0U3BlY2lmaWVyRm9yRG9tYWluUmVzb3VyY2UoZnVsbHlRdWFsaWZpZWREb21haW5OYW1lKSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkFwaU1hcHBpbmcnIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaURlZmF1bHREb21haW5NYXBwaW5nKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6QXBpTWFwcGluZycgfVxuICAgIH0pO1xuICB9LFxuICBsaXN0ZW5lcihleHBvc3VyZVBvcnQ6IG51bWJlciwgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgUG9ydCR7ZXhwb3N1cmVQb3J0fWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TGlzdGVuZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgbGlzdGVuZXJSdWxlKGV4cG9zdXJlUG9ydDogbnVtYmVyLCBzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgcnVsZVByaW9yaXR5OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgUG9ydCR7ZXhwb3N1cmVQb3J0fVByaW9yaXR5JHtydWxlUHJpb3JpdHl9YCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMaXN0ZW5lclJ1bGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgbGlzdGVuZXJDZXJ0aWZpY2F0ZUxpc3QoZXhwb3N1cmVQb3J0OiBudW1iZXIsIHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYFBvcnQke2V4cG9zdXJlUG9ydH1gIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6Okxpc3RlbmVyQ2VydGlmaWNhdGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgbG9hZEJhbGFuY2VyKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6OkxvYWRCYWxhbmNlcicgfVxuICAgIH0pO1xuICB9LFxuICBlY3NMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgY29udGFpbmVyTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogY29udGFpbmVyTmFtZSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBhdXRvU2NhbGluZ1RhcmdldChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsYWJsZVRhcmdldCcgfVxuICAgIH0pO1xuICB9LFxuICBkeW5hbW9BdXRvU2NhbGluZ1RhcmdldChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgbWV0cmljOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBtZXRyaWMgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnIH1cbiAgICB9KTtcbiAgfSxcbiAgYXV0b1NjYWxpbmdQb2xpY3koc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIG1ldHJpYzogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogbWV0cmljIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxpbmdQb2xpY3knIH1cbiAgICB9KTtcbiAgfSxcbiAgY3VzdG9tUmVzb3VyY2VTM0V2ZW50cygpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRXZlbnRzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gQGRlcHJlY2F0ZWRcbiAgLy8gc3RhY2t0YXBlU2VydmljZUN1c3RvbVJlc291cmNlRWRnZUZ1bmN0aW9ucygpIHtcbiAgLy8gICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgLy8gICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRWRnZUZ1bmN0aW9ucycgfSxcbiAgLy8gICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gIC8vICAgfSk7XG4gIC8vIH0sXG4gIGN1c3RvbVJlc291cmNlU2Vuc2l0aXZlRGF0YSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU2Vuc2l0aXZlRGF0YScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVJlc291cmNlQWNjZXB0VnBjUGVlcmluZ3MoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0FjY2VwdFZwY1BlZXJpbmdzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgY3VzdG9tUmVzb3VyY2VEZWZhdWx0RG9tYWluQ2VydCgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRGVmYXVsdERvbWFpbkNlcnQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBjdXN0b21SZXNvdXJjZUVkZ2VMYW1iZGFCdWNrZXQoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0VkZ2VMYW1iZGFCdWNrZXQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBjdXN0b21SZXNvdXJjZUVkZ2VMYW1iZGEoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRWRnZUxhbWJkYScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgY2RuPzogYm9vbGVhbikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGAke2NkbiA/ICdDZG4nIDogJyd9RGVmYXVsdERvbWFpbmAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVJlc291cmNlRGF0YWJhc2VEZWxldGlvblByb3RlY3Rpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRGVsZXRpb25Qcm90ZWN0aW9uJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgdXNlclBvb2woc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q29nbml0bzo6VXNlclBvb2wnIH1cbiAgICB9KTtcbiAgfSxcbiAgdXNlclBvb2xDbGllbnQoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q29nbml0bzo6VXNlclBvb2xDbGllbnQnIH1cbiAgICB9KTtcbiAgfSxcbiAgdXNlclBvb2xEb21haW4oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q29nbml0bzo6VXNlclBvb2xEb21haW4nIH1cbiAgICB9KTtcbiAgfSxcbiAgaWRlbnRpdHlQcm92aWRlcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgdHlwZTogU3RwVXNlckF1dGhQb29sWydpZGVudGl0eVByb3ZpZGVycyddW251bWJlcl1bJ3R5cGUnXSkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGUgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q29nbml0bzo6VXNlclBvb2xJZGVudGl0eVByb3ZpZGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGNvZ25pdG9MYW1iZGFIb29rUGVybWlzc2lvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgaG9va05hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGhvb2tOYW1lIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicgfVxuICAgIH0pO1xuICB9LFxuICBjb2duaXRvVXNlclBvb2xEZXRhaWxzQ3VzdG9tUmVzb3VyY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnVXNlclBvb2xEZXRhaWxzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgdXNlclBvb2xVaUN1c3RvbWl6YXRpb25BdHRhY2htZW50KHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sVUlDdXN0b21pemF0aW9uQXR0YWNobWVudCcgfVxuICAgIH0pO1xuICB9LFxuICBzZXJ2aWNlRGlzY292ZXJ5UHJpdmF0ZU5hbWVzcGFjZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRGlzY292ZXJ5JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTZXJ2aWNlRGlzY292ZXJ5OjpTZXJ2aWNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxhbWJkYUNvZGVEZXBsb3lBcHAoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0xhbWJkYUNvZGVEZXBsb3knIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkFwcGxpY2F0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIHNoYXJlZENodW5rTGF5ZXIobGF5ZXJOdW1iZXI6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGBTaGFyZWRDaHVua0xheWVyJHtsYXllck51bWJlcn1gIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6TGF5ZXJWZXJzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc0NvZGVEZXBsb3lBcHAoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0VDU0NvZGVEZXBsb3knIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkFwcGxpY2F0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIHN0YWNrQnVkZ2V0KHN0YWNrTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogcGFzY2FsQ2FzZShzdGFja05hbWUpLnJlcGxhY2VBbGwoJ18nLCAnJykgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QnVkZ2V0czo6QnVkZ2V0JyB9XG4gICAgfSk7XG4gIH0sXG4gIHVwc3Rhc2hSZWRpc0RhdGFiYXNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdVcHN0YXNoOjpEYXRhYmFzZXNWMTo6RGF0YWJhc2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgdXBzdGFzaENyZWRlbnRpYWxzUHJvdmlkZXIoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1Vwc3Rhc2hDcmVkZW50aWFsc1Byb3ZpZGVyJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgY2xvdWR3YXRjaEFsYXJtKHN0YWNrdGFwZUFsYXJtTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6IHN0YWNrdGFwZUFsYXJtTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRXYXRjaDo6QWxhcm0nIH1cbiAgICB9KS5yZXBsYWNlQWxsKCdfJywgJycpO1xuICB9LFxuICBjbG91ZHdhdGNoQWxhcm1FdmVudEJ1c05vdGlmaWNhdGlvblJ1bGUoc3RhY2t0YXBlQWxhcm1OYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZTogc3RhY2t0YXBlQWxhcm1OYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdOb3RpZmljYXRpb24nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkV2ZW50czo6UnVsZScgfVxuICAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIH0sXG4gIGNsb3Vkd2F0Y2hBbGFybUV2ZW50QnVzTm90aWZpY2F0aW9uUnVsZUxhbWJkYVBlcm1pc3Npb24oc3RhY2t0YXBlQWxhcm1OYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZTogc3RhY2t0YXBlQWxhcm1OYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdOb3RpZmljYXRpb24nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicgfVxuICAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIH0sXG4gIGNsb3Vkd2F0Y2hBbGFybVNoYXJlZEV2ZW50QnVzTm90aWZpY2F0aW9uUnVsZUxhbWJkYVBlcm1pc3Npb24oKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0Nsb3Vkd2F0Y2hBbGFybU5vdGlmaWNhdGlvblNoYXJlZCcgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSkucmVwbGFjZUFsbCgnXycsICcnKTtcbiAgfSxcbiAgc3FzUXVldWUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScgfVxuICAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIH0sXG4gIHNxc1F1ZXVlUG9saWN5KHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlNRUzo6UXVldWVQb2xpY3knIH1cbiAgICB9KTtcbiAgfSxcbiAgc25zVG9waWMoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U05TOjpUb3BpYycgfVxuICAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIH0sXG4gIGtpbmVzaXNTdHJlYW0oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6S2luZXNpczo6U3RyZWFtJyB9XG4gICAgfSk7XG4gIH0sXG4gIHdlYkFwcEZpcmV3YWxsQ3VzdG9tUmVzb3VyY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnV2ViQXBwRmlyZXdhbGwnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICB3ZWJBcHBGaXJld2FsbEFzc29jaWF0aW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OldBRnYyOjpXZWJBQ0xBc3NvY2lhdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBvcGVuU2VhcmNoRG9tYWluKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6Ok9wZW5TZWFyY2hTZXJ2aWNlOjpEb21haW4nIH1cbiAgICB9KTtcbiAgfSxcbiAgb3BlblNlYXJjaEN1c3RvbVJlc291cmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ09wZW5TZWFyY2gnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBvcGVuU2VhcmNoU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgbG9nRm9yd2FyZGluZ0ZpcmVob3NlVG9TM1JvbGUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnTG9nRm9yd2FyZGluZ1MzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgbG9nRm9yd2FyZGluZ0N3VG9GaXJlaG9zZVJvbGUoeyBsb2dHcm91cENmTG9naWNhbE5hbWUgfTogeyBsb2dHcm91cENmTG9naWNhbE5hbWU6IHN0cmluZyB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6IGxvZ0dyb3VwQ2ZMb2dpY2FsTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQ3dUb0ZpcmVob3NlJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgbG9nRm9yd2FyZGluZ0ZhaWxlZEV2ZW50c0J1Y2tldChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdMb2dGb3J3YXJkaW5nRmFpbGVkUmVjb3JkcycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfVxuICAgIH0pO1xuICB9LFxuICBsb2dGb3J3YXJkaW5nRmlyZWhvc2VEZWxpdmVyeVN0cmVhbSh7IGxvZ0dyb3VwQ2ZMb2dpY2FsTmFtZSB9OiB7IGxvZ0dyb3VwQ2ZMb2dpY2FsTmFtZTogc3RyaW5nIH0pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZTogbG9nR3JvdXBDZkxvZ2ljYWxOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpLaW5lc2lzRmlyZWhvc2U6OkRlbGl2ZXJ5U3RyZWFtJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxvZ0ZvcndhcmRpbmdTdWJzY3JpcHRpb25GaWx0ZXIoeyBsb2dHcm91cENmTG9naWNhbE5hbWUgfTogeyBsb2dHcm91cENmTG9naWNhbE5hbWU6IHN0cmluZyB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6IGxvZ0dyb3VwQ2ZMb2dpY2FsTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6U3Vic2NyaXB0aW9uRmlsdGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGlzc3VlRGV0ZWN0aW9uU3Vic2NyaXB0aW9uRmlsdGVyKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0lzc3VlRGV0ZWN0aW9uJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpTdWJzY3JpcHRpb25GaWx0ZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgaXNzdWVEZXRlY3Rpb25Mb2dzUGVybWlzc2lvbigpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnSXNzdWVEZXRlY3Rpb25Mb2dzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlBlcm1pc3Npb24nIH1cbiAgICB9KTtcbiAgfVxufTtcblxuY29uc3QgYnVpbGRDZkxvZ2ljYWxOYW1lID0gKHtcbiAgc3RwUmVzb3VyY2VOYW1lLFxuICBzcGVjaWZpZXIsXG4gIHN1ZmZpeFxufToge1xuICBzdHBSZXNvdXJjZU5hbWU/OiBzdHJpbmc7XG4gIHNwZWNpZmllcj86IHsgdHlwZTogc3RyaW5nOyB0eXBlSW5kZXg/OiBudW1iZXI7IHN1YnR5cGU/OiBzdHJpbmcgfTtcbiAgc3VmZml4OiB7XG4gICAgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6IENsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlIHwgU3VwcG9ydGVkUHJpdmF0ZUNmUmVzb3VyY2VUeXBlO1xuICAgIGluZGV4PzogbnVtYmVyO1xuICB9O1xufSkgPT4ge1xuICBjb25zdCBzcGxpdHRlZFR5cGUgPSBzdWZmaXguY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGUuc3BsaXQoJzonKTtcbiAgY29uc3QgcmVzb2x2ZWRQYXJlbnROYW1lID0gc3RwUmVzb3VyY2VOYW1lIHx8ICdTdHAnO1xuICBjb25zdCByZXNvbHZlZFNwZWNpZmllciA9IHNwZWNpZmllclxuICAgID8gYCR7c3BlY2lmaWVyLnR5cGV9JHtzcGVjaWZpZXIudHlwZUluZGV4ICE9PSB1bmRlZmluZWQgPyBzcGVjaWZpZXIudHlwZUluZGV4IDogJyd9JHtcbiAgICAgICAgc3BlY2lmaWVyLnN1YnR5cGUgIT09IHVuZGVmaW5lZCA/IGAtJHtzcGVjaWZpZXIuc3VidHlwZX1gIDogJydcbiAgICAgIH1gXG4gICAgOiAnJztcbiAgY29uc3QgcmVzb2x2ZWRTdWZmaXggPSBgJHtzcGxpdHRlZFR5cGVbc3BsaXR0ZWRUeXBlLmxlbmd0aCAtIDFdfSR7c3VmZml4LmluZGV4ICE9PSB1bmRlZmluZWQgPyBzdWZmaXguaW5kZXggOiAnJ31gO1xuICByZXR1cm4gcGFzY2FsQ2FzZShgJHtyZXNvbHZlZFBhcmVudE5hbWV9LSR7cmVzb2x2ZWRTcGVjaWZpZXJ9LSR7cmVzb2x2ZWRTdWZmaXh9YCk7XG59O1xuXG5jb25zdCBnZXRTcGVjaWZpZXJGb3JEb21haW5SZXNvdXJjZSA9IChmdWxseVF1YWxpZmllZERvbWFpbk5hbWUpID0+IHtcbiAgaWYgKHBhc2NhbENhc2UoZnVsbHlRdWFsaWZpZWREb21haW5OYW1lKS5yZXBsYWNlKCdfJywgJycpLmxlbmd0aCA8IDg1KSB7XG4gICAgcmV0dXJuIHBhc2NhbENhc2UoZnVsbHlRdWFsaWZpZWREb21haW5OYW1lKS5yZXBsYWNlKCdfJywgJycpO1xuICB9XG4gIGNvbnN0IHNwbGl0dGVkRG9tYWluID0gZnVsbHlRdWFsaWZpZWREb21haW5OYW1lXG4gICAgLnNwbGl0KCcuJylcbiAgICAubWFwKChzdWJkb21haW4pID0+IHN1YmRvbWFpbi5zcGxpdCgnLScpKVxuICAgIC5mbGF0KCk7XG4gIGNvbnN0IG1heENoYXJhY3RlcnNQZXJXb3JkID0gTWF0aC5mbG9vcig4NSAvIHNwbGl0dGVkRG9tYWluLmxlbmd0aCk7XG4gIHJldHVybiBzcGxpdHRlZERvbWFpbi5tYXAoKHdvcmQpID0+IHBhc2NhbENhc2Uod29yZC5zbGljZSgwLCBtYXhDaGFyYWN0ZXJzUGVyV29yZCkpLnJlcGxhY2UoJ18nLCAnJykpLmpvaW4oJycpO1xufTtcbiIsCiAgICAiaW1wb3J0IHsgY2ZMb2dpY2FsTmFtZXMgfSBmcm9tICcuLi8uLi8uLi8uLi9zaGFyZWQvbmFtaW5nL2xvZ2ljYWwtbmFtZXMnO1xuXG5leHBvcnQgY29uc3QgQ0hJTERfUkVTT1VSQ0VTOiBSZWNvcmQ8XG4gIFN0cFJlc291cmNlVHlwZSxcbiAgQXJyYXk8eyBsb2dpY2FsTmFtZTogKC4uLmFyZ3M6IGFueVtdKSA9PiBzdHJpbmc7IHJlc291cmNlVHlwZTogc3RyaW5nOyBjb25kaXRpb25hbD86IHRydWU7IHVucmVzb2x2YWJsZT86IHRydWUgfT5cbj4gPSB7XG4gIC8vID09PT09IEJVQ0tFVCA9PT09PVxuICBidWNrZXQ6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXQsIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXRQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBGVU5DVElPTiA9PT09PVxuICBmdW5jdGlvbjogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVmc0FjY2Vzc1BvaW50LCByZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6QWNjZXNzUG9pbnQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLndvcmtsb2FkU2VjdXJpdHlHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVVybCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVB1YmxpY1VybFBlcm1pc3Npb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFJbnZva2VDb25maWcsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6RXZlbnRJbnZva2VDb25maWcnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFDb2RlRGVwbG95QXBwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpBcHBsaWNhdGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVZlcnNpb25QdWJsaXNoZXJDdXN0b21SZXNvdXJjZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY29kZURlcGxveURlcGxveW1lbnRHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6RGVwbG95bWVudEdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFTdHBBbGlhcywgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkFsaWFzJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhUGVybWlzc2lvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IFJFTEFUSU9OQUwgREFUQUJBU0UgPT09PT1cbiAgJ3JlbGF0aW9uYWwtZGF0YWJhc2UnOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZGJTdWJuZXRHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6OkRCU3VibmV0R3JvdXAnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZGJTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VEYXRhYmFzZURlbGV0aW9uUHJvdGVjdGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXJvcmFEYkNsdXN0ZXIsIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQkNsdXN0ZXInLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXJvcmFEYkNsdXN0ZXJQYXJhbWV0ZXJHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQkNsdXN0ZXJQYXJhbWV0ZXJHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1cm9yYURiQ2x1c3RlckxvZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1cm9yYURiSW5zdGFuY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJJbnN0YW5jZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1cm9yYURiSW5zdGFuY2VQYXJhbWV0ZXJHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQlBhcmFtZXRlckdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kYkluc3RhbmNlLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJJbnN0YW5jZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRiSW5zdGFuY2VMb2dHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRiT3B0aW9uR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpPcHRpb25Hcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRiSW5zdGFuY2VQYXJhbWV0ZXJHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQlBhcmFtZXRlckdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZGJSZXBsaWNhLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6OkRCSW5zdGFuY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kYlJlcGxpY2FMb2dHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gRFlOQU1PIERCIFRBQkxFID09PT09XG4gICdkeW5hbW8tZGItdGFibGUnOiBbeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZHluYW1vR2xvYmFsVGFibGUsIHJlc291cmNlVHlwZTogJ0FXUzo6RHluYW1vREI6Okdsb2JhbFRhYmxlJyB9XSxcblxuICAvLyA9PT09PSBIVFRQIEFQSSBHQVRFV0FZID09PT09XG4gICdodHRwLWFwaS1nYXRld2F5JzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGksIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpBcGknIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaVN0YWdlLCByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6U3RhZ2UnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaUxvZ0dyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaVZwY0xpbmtTZWN1cml0eUdyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlWcGNMaW5rLCByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6VnBjTGluaycsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaURvbWFpbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkRvbWFpbk5hbWUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpRG9tYWluTWFwcGluZyxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpBcGlNYXBwaW5nJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6RG9tYWluTmFtZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlEZWZhdWx0RG9tYWluTWFwcGluZyxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpBcGlNYXBwaW5nJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRuc1JlY29yZCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSb3V0ZTUzOjpSZWNvcmRTZXQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdENhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21PcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRPcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERpc3RyaWJ1dGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RGlzdHJpYnV0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IEJBVENIIEpPQiA9PT09PVxuICAnYmF0Y2gtam9iJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhdGNoU2VydmljZVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaFNwb3RGbGVldFJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaEluc3RhbmNlUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhdGNoSW5zdGFuY2VQcm9maWxlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6SW5zdGFuY2VQcm9maWxlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaFN0YXRlTWFjaGluZUV4ZWN1dGlvblJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hJbnN0YW5jZUxhdW5jaFRlbXBsYXRlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkxhdW5jaFRlbXBsYXRlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hJbnN0YW5jZURlZmF1bHRTZWN1cml0eUdyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaENvbXB1dGVFbnZpcm9ubWVudCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QmF0Y2g6OkNvbXB1dGVFbnZpcm9ubWVudCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hKb2JRdWV1ZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpCYXRjaDo6Sm9iUXVldWUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhdGNoSm9iRGVmaW5pdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpCYXRjaDo6Sm9iRGVmaW5pdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaFN0YXRlTWFjaGluZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hKb2JMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hKb2JFeGVjdXRpb25Sb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb1VzZXJBc3NvY2lhdGVkV2l0aFJvbGUsXG4gICAgICByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpEYXRhYmFzZVVzZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gRVZFTlQgQlVTID09PT09XG4gICdldmVudC1idXMnOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZXZlbnRCdXMsIHJlc291cmNlVHlwZTogJ0FXUzo6RXZlbnRzOjpFdmVudEJ1cycgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5ldmVudEJ1c0FyY2hpdmUsIHJlc291cmNlVHlwZTogJ0FXUzo6RXZlbnRzOjpBcmNoaXZlJywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFNUQVRFIE1BQ0hJTkUgPT09PT1cbiAgJ3N0YXRlLW1hY2hpbmUnOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZ2xvYmFsU3RhdGVNYWNoaW5lc1JvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zdGF0ZU1hY2hpbmUsIHJlc291cmNlVHlwZTogJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJyB9XG4gIF0sXG5cbiAgLy8gPT09PT0gUkVESVMgQ0xVU1RFUiA9PT09PVxuICAncmVkaXMtY2x1c3Rlcic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5yZWRpc1BhcmFtZXRlckdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aUNhY2hlOjpQYXJhbWV0ZXJHcm91cCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5yZWRpc1N1Ym5ldEdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aUNhY2hlOjpTdWJuZXRHcm91cCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5yZWRpc1NlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnJlZGlzTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnJlZGlzUmVwbGljYXRpb25Hcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGlDYWNoZTo6UmVwbGljYXRpb25Hcm91cCcgfVxuICBdLFxuXG4gIC8vID09PT09IE1PTkdPIERCIEFUTEFTIENMVVNURVIgPT09PT1cbiAgJ21vbmdvLWRiLWF0bGFzLWNsdXN0ZXInOiBbXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29DcmVkZW50aWFsc1Byb3ZpZGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29Qcm9qZWN0LCByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpQcm9qZWN0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb1Byb2plY3RJcEFjY2Vzc0xpc3QsXG4gICAgICByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpQcm9qZWN0SXBBY2Nlc3NMaXN0JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb1Byb2plY3RWcGNOZXR3b3JrQ29udGFpbmVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6TmV0d29ya0NvbnRhaW5lcicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29Qcm9qZWN0VnBjTmV0d29ya1BlZXJpbmcsXG4gICAgICByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpOZXR3b3JrUGVlcmluZycsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb1ZwY1JvdXRlLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6Um91dGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29DbHVzdGVyLCByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpDbHVzdGVyJyB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdGxhc01vbmdvQ2x1c3Rlck1hc3RlclVzZXIsXG4gICAgICByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpEYXRhYmFzZVVzZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gVVNFUiBBVVRIIFBPT0wgPT09PT1cbiAgJ3VzZXItYXV0aC1wb29sJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVzZXJQb29sLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNuc1JvbGVTZW5kU21zRnJvbUNvZ25pdG8sIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVzZXJQb29sQ2xpZW50LCByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sQ2xpZW50JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVzZXJQb29sRG9tYWluLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sRG9tYWluJyB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jb2duaXRvVXNlclBvb2xEZXRhaWxzQ3VzdG9tUmVzb3VyY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZSdcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5pZGVudGl0eVByb3ZpZGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2duaXRvOjpVc2VyUG9vbElkZW50aXR5UHJvdmlkZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jb2duaXRvTGFtYmRhSG9va1Blcm1pc3Npb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVzZXJQb29sVWlDdXN0b21pemF0aW9uQXR0YWNobWVudCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q29nbml0bzo6VXNlclBvb2xVSUN1c3RvbWl6YXRpb25BdHRhY2htZW50JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMud2ViQXBwRmlyZXdhbGxBc3NvY2lhdGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6V0FGdjI6OldlYkFDTEFzc29jaWF0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IFVQU1RBU0ggUkVESVMgPT09PT1cbiAgJ3Vwc3Rhc2gtcmVkaXMnOiBbXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVwc3Rhc2hDcmVkZW50aWFsc1Byb3ZpZGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVwc3Rhc2hSZWRpc0RhdGFiYXNlLCByZXNvdXJjZVR5cGU6ICdVcHN0YXNoOjpSZWRpczo6RGF0YWJhc2UnIH1cbiAgXSxcblxuICAvLyA9PT09PSBBUFBMSUNBVElPTiBMT0FEIEJBTEFOQ0VSID09PT09XG4gICdhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxvYWRCYWxhbmNlciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMb2FkQmFsYW5jZXInIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubG9hZEJhbGFuY2VyU2VjdXJpdHlHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLndlYkFwcEZpcmV3YWxsQXNzb2NpYXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OldBRnYyOjpXZWJBQ0xBc3NvY2lhdGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGlzdGVuZXIsIHJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TGlzdGVuZXInLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gTkVUV09SSyBMT0FEIEJBTEFOQ0VSID09PT09XG4gICduZXR3b3JrLWxvYWQtYmFsYW5jZXInOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubG9hZEJhbGFuY2VyLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6OkxvYWRCYWxhbmNlcicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sb2FkQmFsYW5jZXJTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5saXN0ZW5lciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMaXN0ZW5lcicsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IEhPU1RJTkcgQlVDS0VUID09PT09XG4gIC8vIEhvc3RpbmcgYnVja2V0IGRlbGVnYXRlcyB0byBhIGJ1Y2tldCByZXNvdXJjZSwgc28gaXQgaW5jbHVkZXMgYWxsIGJ1Y2tldCBjaGlsZCByZXNvdXJjZXNcbiAgJ2hvc3RpbmctYnVja2V0JzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldFBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFdFQiBBUFAgRklSRVdBTEwgPT09PT1cbiAgJ3dlYi1hcHAtZmlyZXdhbGwnOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMud2ViQXBwRmlyZXdhbGxDdXN0b21SZXNvdXJjZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgXSxcblxuICAvLyA9PT09PSBPUEVOIFNFQVJDSCBET01BSU4gPT09PT1cbiAgJ29wZW4tc2VhcmNoLWRvbWFpbic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5vcGVuU2VhcmNoRG9tYWluLCByZXNvdXJjZVR5cGU6ICdBV1M6Ok9wZW5TZWFyY2hTZXJ2aWNlOjpEb21haW4nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMub3BlblNlYXJjaFNlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMub3BlblNlYXJjaERvbWFpbkxvZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLm9wZW5TZWFyY2hDdXN0b21SZXNvdXJjZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IEVGUyBGSUxFU1lTVEVNID09PT09XG4gICdlZnMtZmlsZXN5c3RlbSc6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lZnNGaWxlc3lzdGVtLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6RmlsZVN5c3RlbScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lZnNTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWZzTW91bnRUYXJnZXQsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6TW91bnRUYXJnZXQnLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IE5FWFRKUyBXRUIgPT09PT1cbiAgLy8gTmV4dEpTIHdlYiBkZWxlZ2F0ZXMgdG86IGJ1Y2tldCwgaW1hZ2VGdW5jdGlvbiwgcmV2YWxpZGF0aW9uRnVuY3Rpb24sIHJldmFsaWRhdGlvblF1ZXVlLFxuICAvLyByZXZhbGlkYXRpb25UYWJsZSwgcmV2YWxpZGF0aW9uSW5zZXJ0RnVuY3Rpb24sIGFuZCBvcHRpb25hbGx5IHNlcnZlckVkZ2VGdW5jdGlvbiBvciBzZXJ2ZXJGdW5jdGlvblxuICAnbmV4dGpzLXdlYic6IFtcbiAgICAvLyBOZXh0SlMtc3BlY2lmaWMgcmVzb3VyY2VzXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLm9wZW5OZXh0SG9zdEhlYWRlclJld3JpdGVGdW5jdGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RnVuY3Rpb24nXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMub3Blbk5leHRBc3NldFJlcGxhY2VyQ3VzdG9tUmVzb3VyY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZSdcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5vcGVuTmV4dER5bmFtb0luc2VydEN1c3RvbVJlc291cmNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnXG4gICAgfSxcbiAgICAvLyBGcm9tIGJ1Y2tldFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldFBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICAvLyBGcm9tIGZ1bmN0aW9ucyAoaW1hZ2VGdW5jdGlvbiwgcmV2YWxpZGF0aW9uRnVuY3Rpb24sIHNlcnZlckZ1bmN0aW9uLCB3YXJtZXJGdW5jdGlvbiwgcmV2YWxpZGF0aW9uSW5zZXJ0RnVuY3Rpb24pXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVVybCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgLy8gRnJvbSBlZGdlIGZ1bmN0aW9uIChzZXJ2ZXJFZGdlRnVuY3Rpb24pXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRWRnZUxhbWJkYSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICAvLyBGcm9tIHJldmFsaWRhdGlvblF1ZXVlXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3FzUXVldWUsIHJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zcXNRdWV1ZVBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTUVM6OlF1ZXVlUG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICAvLyBGcm9tIHJldmFsaWRhdGlvblRhYmxlXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZHluYW1vR2xvYmFsVGFibGUsIHJlc291cmNlVHlwZTogJ0FXUzo6RHluYW1vREI6Okdsb2JhbFRhYmxlJyB9XG4gIF0sXG5cbiAgLy8gPT09PT0gTVVMVEktQ09OVEFJTkVSIFdPUktMT0FEID09PT09XG4gICdtdWx0aS1jb250YWluZXItd29ya2xvYWQnOiBbXG4gICAgLy8gU2hhcmVkIGdsb2JhbCByZXNvdXJjZXMgKGNvbmRpdGlvbmFsIC0gY3JlYXRlZCBvbmx5IG9uY2UgaWYgbm90IGV4aXN0cylcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFeGVjdXRpb25Sb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQXV0b1NjYWxpbmdSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgLy8gU2NhbGluZyByZXNvdXJjZXMgKGNvbmRpdGlvbmFsIC0gb25seSBpZiBzY2FsaW5nIGlzIGNvbmZpZ3VyZWQpXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1dG9TY2FsaW5nVGFyZ2V0LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsYWJsZVRhcmdldCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1dG9TY2FsaW5nUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsaW5nUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICAvLyBFQzItYmFzZWQgcmVzb3VyY2VzIChjb25kaXRpb25hbCAtIG9ubHkgaWYgaW5zdGFuY2VUeXBlcyBhcmUgY29uZmlndXJlZClcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZXZlbnRCdXNSb2xlRm9yU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlUHJvZmlsZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlTGF1bmNoVGVtcGxhdGUsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TGF1bmNoVGVtcGxhdGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJBdXRvc2NhbGluZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6QXV0b1NjYWxpbmdHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkZvcmNlRGVsZXRlQXV0b3NjYWxpbmdHcm91cEN1c3RvbVJlc291cmNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJDYXBhY2l0eVByb3ZpZGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNhcGFjaXR5UHJvdmlkZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJDYXBhY2l0eVByb3ZpZGVyQXNzb2NpYXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2x1c3RlckNhcGFjaXR5UHJvdmlkZXJBc3NvY2lhdGlvbnMnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zY2hlZHVsZXJSdWxlRm9yU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpTY2hlZHVsZXI6OlNjaGVkdWxlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQXV0b3NjYWxpbmdHcm91cFdhcm1Qb29sLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6V2FybVBvb2wnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIC8vIERlcGxveW1lbnQgcmVzb3VyY2VzIChjb25kaXRpb25hbCAtIG9ubHkgaWYgZGVwbG95bWVudCBpcyBjb25maWd1cmVkKVxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0NvZGVEZXBsb3lBcHAsIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6QXBwbGljYXRpb24nLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jb2RlRGVwbG95RGVwbG95bWVudEdyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpEZXBsb3ltZW50R3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIC8vIENvcmUgcmVzb3VyY2VzIChhbHdheXMgcHJlc2VudClcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NDbHVzdGVyLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2x1c3RlcicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy53b3JrbG9hZFNlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NTZXJ2aWNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OlNlcnZpY2UnLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NUYXNrUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzVGFza0RlZmluaXRpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicgfSxcbiAgICAvLyBDb25kaXRpb25hbCByZXNvdXJjZXNcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzTG9nR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lZnNBY2Nlc3NQb2ludCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFRlM6OkFjY2Vzc1BvaW50JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb1VzZXJBc3NvY2lhdGVkV2l0aFJvbGUsXG4gICAgICByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpEYXRhYmFzZVVzZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gU1FTIFFVRVVFID09PT09XG4gICdzcXMtcXVldWUnOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3FzUXVldWUsIHJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zcXNRdWV1ZVBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTUVM6OlF1ZXVlUG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFNOUyBUT1BJQyA9PT09PVxuICAnc25zLXRvcGljJzogW3sgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNuc1RvcGljLCByZXNvdXJjZVR5cGU6ICdBV1M6OlNOUzo6VG9waWMnIH1dLFxuXG4gIC8vID09PT09IEtJTkVTSVMgU1RSRUFNID09PT09XG4gICdraW5lc2lzLXN0cmVhbSc6IFt7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5raW5lc2lzU3RyZWFtLCByZXNvdXJjZVR5cGU6ICdBV1M6OktpbmVzaXM6OlN0cmVhbScgfV0sXG5cbiAgLy8gPT09PT0gQkFTVElPTiA9PT09PVxuICBiYXN0aW9uOiBbXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhc3Rpb25DbG91ZHdhdGNoU3NtRG9jdW1lbnQsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OlNTTTo6RG9jdW1lbnQnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhc3Rpb25FYzJBdXRvc2NhbGluZ0dyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkF1dG9TY2FsaW5nOjpBdXRvU2NhbGluZ0dyb3VwJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhc3Rpb25TZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXN0aW9uRWMyTGF1bmNoVGVtcGxhdGUsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpMYXVuY2hUZW1wbGF0ZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXN0aW9uUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmFzdGlvbkVjMkluc3RhbmNlUHJvZmlsZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXN0aW9uQ3dBZ2VudFNzbUFzc29jaWF0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OlNTTTo6QXNzb2NpYXRpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmFzdGlvblNzbUFnZW50U3NtQXNzb2NpYXRpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6U1NNOjpBc3NvY2lhdGlvbicgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmFzdGlvbkxvZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH1cbiAgXSxcblxuICAvLyA9PT09PSBFREdFIExBTUJEQSBGVU5DVElPTiA9PT09PVxuICAnZWRnZS1sYW1iZGEtZnVuY3Rpb24nOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VFZGdlTGFtYmRhLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICBdLFxuXG4gIC8vID09PT09IFdFQiBTRVJWSUNFID09PT09XG4gIC8vIFdlYiBzZXJ2aWNlIGRlbGVnYXRlcyB0bzogY29udGFpbmVyV29ya2xvYWQgKyBvcHRpb25hbGx5IChodHRwQXBpR2F0ZXdheSBPUiBsb2FkQmFsYW5jZXIgT1IgbmV0d29ya0xvYWRCYWxhbmNlcilcbiAgJ3dlYi1zZXJ2aWNlJzogW1xuICAgIC8vIEZyb20gbXVsdGktY29udGFpbmVyLXdvcmtsb2FkIC0gY29yZSByZXNvdXJjZXMgKGFsd2F5cyBwcmVzZW50KVxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0NsdXN0ZXIsIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDbHVzdGVyJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLndvcmtsb2FkU2VjdXJpdHlHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc1NlcnZpY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6U2VydmljZScsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc1Rhc2tSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NUYXNrRGVmaW5pdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJyB9LFxuICAgIC8vIEZyb20gbXVsdGktY29udGFpbmVyLXdvcmtsb2FkIC0gY29uZGl0aW9uYWwgcmVzb3VyY2VzXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRXhlY3V0aW9uUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0F1dG9TY2FsaW5nUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXRvU2NhbGluZ1RhcmdldCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXRvU2NhbGluZ1BvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGluZ1BvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMySW5zdGFuY2VSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmV2ZW50QnVzUm9sZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZVByb2ZpbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpJbnN0YW5jZVByb2ZpbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZUxhdW5jaFRlbXBsYXRlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkxhdW5jaFRlbXBsYXRlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQXV0b3NjYWxpbmdHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6OkF1dG9TY2FsaW5nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJGb3JjZURlbGV0ZUF1dG9zY2FsaW5nR3JvdXBDdXN0b21SZXNvdXJjZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQ2FwYWNpdHlQcm92aWRlcixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDYXBhY2l0eVByb3ZpZGVyJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQ2FwYWNpdHlQcm92aWRlckFzc29jaWF0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNsdXN0ZXJDYXBhY2l0eVByb3ZpZGVyQXNzb2NpYXRpb25zJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc2NoZWR1bGVyUnVsZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6U2NoZWR1bGVyOjpTY2hlZHVsZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkF1dG9zY2FsaW5nR3JvdXBXYXJtUG9vbCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6Oldhcm1Qb29sJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NDb2RlRGVwbG95QXBwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkFwcGxpY2F0aW9uJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY29kZURlcGxveURlcGxveW1lbnRHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6RGVwbG95bWVudEdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzTG9nR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lZnNBY2Nlc3NQb2ludCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFRlM6OkFjY2Vzc1BvaW50JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICAvLyBGcm9tIGFwcGxpY2F0aW9uLWxvYWQtYmFsYW5jZXIgKGNvbmRpdGlvbmFsIC0gb25seSBpZiBBTEIgaXMgdXNlZClcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubG9hZEJhbGFuY2VyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMb2FkQmFsYW5jZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sb2FkQmFsYW5jZXJTZWN1cml0eUdyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxpc3RlbmVyLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6Okxpc3RlbmVyJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMud2ViQXBwRmlyZXdhbGxBc3NvY2lhdGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6V0FGdjI6OldlYkFDTEFzc29jaWF0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICAvLyBGcm9tIGh0dHAtYXBpLWdhdGV3YXkgKGNvbmRpdGlvbmFsIC0gb25seSBpZiBIVFRQIEFQSSBHYXRld2F5IGlzIHVzZWQsIGFsdGVybmF0aXZlIHRvIEFMQi9OTEIpXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkFwaScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaVN0YWdlLCByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6U3RhZ2UnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlWcGNMaW5rU2VjdXJpdHlHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpVnBjTGluaywgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OlZwY0xpbmsnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlEb21haW4sIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpEb21haW5OYW1lJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaURvbWFpbk1hcHBpbmcsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6QXBpTWFwcGluZycsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkRvbWFpbk5hbWUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpRGVmYXVsdERvbWFpbk1hcHBpbmcsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6QXBpTWFwcGluZycsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgLy8gQ29tbW9uIHJlc291cmNlcyAoZG9tYWlucywgQ0ROIC0gYWxsIGNvbmRpdGlvbmFsKVxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gUFJJVkFURSBTRVJWSUNFID09PT09XG4gIC8vIFByaXZhdGUgc2VydmljZSBkZWxlZ2F0ZXMgdG86IGNvbnRhaW5lcldvcmtsb2FkICsgb3B0aW9uYWxseSBsb2FkQmFsYW5jZXJcbiAgJ3ByaXZhdGUtc2VydmljZSc6IFtcbiAgICAvLyBGcm9tIG11bHRpLWNvbnRhaW5lci13b3JrbG9hZCAtIGNvcmUgcmVzb3VyY2VzIChhbHdheXMgcHJlc2VudClcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NDbHVzdGVyLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2x1c3RlcicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy53b3JrbG9hZFNlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NTZXJ2aWNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OlNlcnZpY2UnLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NUYXNrUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzVGFza0RlZmluaXRpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicgfSxcbiAgICAvLyBGcm9tIG11bHRpLWNvbnRhaW5lci13b3JrbG9hZCAtIGNvbmRpdGlvbmFsIHJlc291cmNlc1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0V4ZWN1dGlvblJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NBdXRvU2NhbGluZ1JvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXV0b1NjYWxpbmdUYXJnZXQsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxhYmxlVGFyZ2V0JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXV0b1NjYWxpbmdQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxpbmdQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5ldmVudEJ1c1JvbGVGb3JTY2hlZHVsZWRJbnN0YW5jZVJlZnJlc2gsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMySW5zdGFuY2VQcm9maWxlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6SW5zdGFuY2VQcm9maWxlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMySW5zdGFuY2VMYXVuY2hUZW1wbGF0ZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpMYXVuY2hUZW1wbGF0ZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkF1dG9zY2FsaW5nR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkF1dG9TY2FsaW5nOjpBdXRvU2NhbGluZ0dyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyRm9yY2VEZWxldGVBdXRvc2NhbGluZ0dyb3VwQ3VzdG9tUmVzb3VyY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkNhcGFjaXR5UHJvdmlkZXIsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2FwYWNpdHlQcm92aWRlcicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkNhcGFjaXR5UHJvdmlkZXJBc3NvY2lhdGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDbHVzdGVyQ2FwYWNpdHlQcm92aWRlckFzc29jaWF0aW9ucycsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNjaGVkdWxlclJ1bGVGb3JTY2hlZHVsZWRJbnN0YW5jZVJlZnJlc2gsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OlNjaGVkdWxlcjo6U2NoZWR1bGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJBdXRvc2NhbGluZ0dyb3VwV2FybVBvb2wsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkF1dG9TY2FsaW5nOjpXYXJtUG9vbCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQ29kZURlcGxveUFwcCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpBcHBsaWNhdGlvbicsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNvZGVEZXBsb3lEZXBsb3ltZW50R3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkRlcGxveW1lbnRHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0xvZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWZzQWNjZXNzUG9pbnQsIHJlc291cmNlVHlwZTogJ0FXUzo6RUZTOjpBY2Nlc3NQb2ludCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgLy8gRnJvbSBhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyIChjb25kaXRpb25hbCAtIG9ubHkgaWYgQUxCIGlzIGNvbmZpZ3VyZWQpXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxvYWRCYWxhbmNlcixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TG9hZEJhbGFuY2VyJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubG9hZEJhbGFuY2VyU2VjdXJpdHlHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5saXN0ZW5lciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMaXN0ZW5lcicsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFdPUktFUiBTRVJWSUNFID09PT09XG4gIC8vIFdvcmtlciBzZXJ2aWNlIGRlbGVnYXRlcyB0bzogY29udGFpbmVyV29ya2xvYWQgb25seVxuICAnd29ya2VyLXNlcnZpY2UnOiBbXG4gICAgLy8gRnJvbSBtdWx0aS1jb250YWluZXItd29ya2xvYWQgLSBjb3JlIHJlc291cmNlcyAoYWx3YXlzIHByZXNlbnQpXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQ2x1c3RlciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNsdXN0ZXInIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMud29ya2xvYWRTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzU2VydmljZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpTZXJ2aWNlJyxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzVGFza1JvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc1Rhc2tEZWZpbml0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nIH0sXG4gICAgLy8gRnJvbSBtdWx0aS1jb250YWluZXItd29ya2xvYWQgLSBjb25kaXRpb25hbCByZXNvdXJjZXNcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFeGVjdXRpb25Sb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQXV0b1NjYWxpbmdSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1dG9TY2FsaW5nVGFyZ2V0LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsYWJsZVRhcmdldCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1dG9TY2FsaW5nUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsaW5nUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZXZlbnRCdXNSb2xlRm9yU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlUHJvZmlsZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlTGF1bmNoVGVtcGxhdGUsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TGF1bmNoVGVtcGxhdGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJBdXRvc2NhbGluZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6QXV0b1NjYWxpbmdHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkZvcmNlRGVsZXRlQXV0b3NjYWxpbmdHcm91cEN1c3RvbVJlc291cmNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJDYXBhY2l0eVByb3ZpZGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNhcGFjaXR5UHJvdmlkZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJDYXBhY2l0eVByb3ZpZGVyQXNzb2NpYXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2x1c3RlckNhcGFjaXR5UHJvdmlkZXJBc3NvY2lhdGlvbnMnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zY2hlZHVsZXJSdWxlRm9yU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpTY2hlZHVsZXI6OlNjaGVkdWxlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQXV0b3NjYWxpbmdHcm91cFdhcm1Qb29sLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6V2FybVBvb2wnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0NvZGVEZXBsb3lBcHAsIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6QXBwbGljYXRpb24nLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jb2RlRGVwbG95RGVwbG95bWVudEdyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpEZXBsb3ltZW50R3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NMb2dHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVmc0FjY2Vzc1BvaW50LCByZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6QWNjZXNzUG9pbnQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdGxhc01vbmdvVXNlckFzc29jaWF0ZWRXaXRoUm9sZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ01vbmdvREI6OlN0cEF0bGFzVjE6OkRhdGFiYXNlVXNlcicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH1cbiAgXSxcblxuICAvLyA9PT09PSBBU1RSTyBXRUIgPT09PT1cbiAgJ2FzdHJvLXdlYic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zc3JXZWJIb3N0SGVhZGVyUmV3cml0ZUZ1bmN0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldFBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGEsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhVXJsLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6VXJsJywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IE5VWFQgV0VCID09PT09XG4gICdudXh0LXdlYic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zc3JXZWJIb3N0SGVhZGVyUmV3cml0ZUZ1bmN0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldFBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGEsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhVXJsLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6VXJsJywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFNWRUxURUtJVCBXRUIgPT09PT1cbiAgJ3N2ZWx0ZWtpdC13ZWInOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3NyV2ViSG9zdEhlYWRlclJld3JpdGVGdW5jdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXQsIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXRQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVVybCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBTT0xJRFNUQVJUIFdFQiA9PT09PVxuICAnc29saWRzdGFydC13ZWInOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3NyV2ViSG9zdEhlYWRlclJld3JpdGVGdW5jdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXQsIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXRQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVVybCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBUQU5TVEFDSyBXRUIgPT09PT1cbiAgJ3RhbnN0YWNrLXdlYic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zc3JXZWJIb3N0SGVhZGVyUmV3cml0ZUZ1bmN0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldFBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGEsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhVXJsLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6VXJsJywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFJFTUlYIFdFQiA9PT09PVxuICAncmVtaXgtd2ViJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNzcldlYkhvc3RIZWFkZXJSZXdyaXRlRnVuY3Rpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYnVja2V0LCByZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYnVja2V0UG9saWN5LCByZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXRQb2xpY3knLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdENhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21PcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRPcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERpc3RyaWJ1dGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RGlzdHJpYnV0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRuc1JlY29yZCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSb3V0ZTUzOjpSZWNvcmRTZXQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYUxvZ0dyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFVcmwsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpVcmwnLCBjb25kaXRpb25hbDogdHJ1ZSB9XG4gIF0sXG5cbiAgLy8gPT09PT0gQ09OVkVYID09PT09XG4gIC8vIFRPRE8oY29udmV4KTogcG9wdWxhdGUgd2l0aCBiYWNrZW5kIHNlcnZpY2UsIGRhc2hib2FyZCBzZXJ2aWNlLCBBTEIsIFJEUywgNSBidWNrZXRzLCBhZG1pbi1rZXkgY3VzdG9tIHJlc291cmNlLlxuICBjb252ZXg6IFtdLFxuXG4gIC8vID09PT09IE9USEVSIFJFU09VUkNFUyA9PT09PVxuICAnY3VzdG9tLXJlc291cmNlLWluc3RhbmNlJzogW10sXG4gICdjdXN0b20tcmVzb3VyY2UtZGVmaW5pdGlvbic6IFtdLFxuICAnZGVwbG95bWVudC1zY3JpcHQnOiBbXSxcbiAgJ2F3cy1jZGstY29uc3RydWN0JzogW11cbn07XG4iLAogICAgImltcG9ydCB7IENISUxEX1JFU09VUkNFUyB9IGZyb20gJy4vY2hpbGQtcmVzb3VyY2VzJztcblxuLy8gUHJpdmF0ZSBzeW1ib2xzIGZvciBpbnRlcm5hbCBtZXRob2RzIC0gbm90IGFjY2Vzc2libGUgZnJvbSBvdXRzaWRlXG4vLyBVc2UgU3ltYm9sLmZvcigpIHNvIGl0IGNhbiBiZSBhY2Nlc3NlZCBhY3Jvc3MgbW9kdWxlcyAoY3J1Y2lhbCBmb3IgbnBtIHBhY2thZ2UgaW50ZXJvcClcbmNvbnN0IGdldFBhcmFtUmVmZXJlbmNlU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmdldFBhcmFtUmVmZXJlbmNlJyk7XG5jb25zdCBnZXRUeXBlU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmdldFR5cGUnKTtcbmNvbnN0IGdldFByb3BlcnRpZXNTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6Z2V0UHJvcGVydGllcycpO1xuY29uc3QgZ2V0T3ZlcnJpZGVzU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmdldE92ZXJyaWRlcycpO1xuY29uc3QgZ2V0VHJhbnNmb3Jtc1N5bWJvbCA9IFN5bWJvbC5mb3IoJ3N0YWNrdGFwZTpnZXRUcmFuc2Zvcm1zJyk7XG5jb25zdCBzZXRSZXNvdXJjZU5hbWVTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6c2V0UmVzb3VyY2VOYW1lJyk7XG5jb25zdCByZXNvdXJjZVBhcmFtUmVmU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmlzUmVzb3VyY2VQYXJhbVJlZicpO1xuY29uc3QgYmFzZVR5cGVQcm9wZXJ0aWVzU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmlzQmFzZVR5cGVQcm9wZXJ0aWVzJyk7XG5jb25zdCBhbGFybVN5bWJvbCA9IFN5bWJvbC5mb3IoJ3N0YWNrdGFwZTppc0FsYXJtJyk7XG5cbi8vIER1Y2stdHlwZSBjaGVja2VycyAtIHVzZSBzeW1ib2xzIGluc3RlYWQgb2YgaW5zdGFuY2VvZiBmb3IgY3Jvc3MtbW9kdWxlIGNvbXBhdGliaWxpdHlcbmNvbnN0IGlzQmFzZVJlc291cmNlID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgQmFzZVJlc291cmNlID0+XG4gIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgc2V0UmVzb3VyY2VOYW1lU3ltYm9sIGluIHZhbHVlO1xuXG5jb25zdCBpc0Jhc2VUeXBlUHJvcGVydGllcyA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEJhc2VUeXBlUHJvcGVydGllcyA9PlxuICB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIGJhc2VUeXBlUHJvcGVydGllc1N5bWJvbCBpbiB2YWx1ZTtcblxuY29uc3QgaXNBbGFybSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEFsYXJtID0+IHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgYWxhcm1TeW1ib2wgaW4gdmFsdWU7XG5cbmNvbnN0IGlzUmVzb3VyY2VQYXJhbVJlZmVyZW5jZSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlc291cmNlUGFyYW1SZWZlcmVuY2UgPT5cbiAgdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiByZXNvdXJjZVBhcmFtUmVmU3ltYm9sIGluIHZhbHVlO1xuXG5jb25zdCBkZWZlcnJlZE5hbWVTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6aXNEZWZlcnJlZFJlc291cmNlTmFtZScpO1xuXG5jb25zdCBpc0RlZmVycmVkUmVzb3VyY2VOYW1lID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgRGVmZXJyZWRSZXNvdXJjZU5hbWUgPT5cbiAgdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiBkZWZlcnJlZE5hbWVTeW1ib2wgaW4gdmFsdWU7XG5cbi8qKlxuICogQSBkZWZlcnJlZCByZWZlcmVuY2UgdG8gYSByZXNvdXJjZSdzIG5hbWUuXG4gKiBVc2VkIHdoZW4gYWNjZXNzaW5nIHJlc291cmNlTmFtZSBiZWZvcmUgdGhlIG5hbWUgaXMgc2V0LlxuICogUmVzb2x2ZXMgbGF6aWx5IGR1cmluZyB0cmFuc2Zvcm1hdGlvbi5cbiAqL1xuY2xhc3MgRGVmZXJyZWRSZXNvdXJjZU5hbWUge1xuICBwcml2YXRlIF9fcmVzb3VyY2U6IEJhc2VSZXNvdXJjZTtcbiAgcmVhZG9ubHkgW2RlZmVycmVkTmFtZVN5bWJvbF0gPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKHJlc291cmNlOiBCYXNlUmVzb3VyY2UpIHtcbiAgICB0aGlzLl9fcmVzb3VyY2UgPSByZXNvdXJjZTtcbiAgfVxuXG4gIHJlc29sdmUoKTogc3RyaW5nIHtcbiAgICAvLyBBdCByZXNvbHV0aW9uIHRpbWUsIHRoZSBuYW1lIHNob3VsZCBiZSBzZXRcbiAgICBjb25zdCBuYW1lID0gKHRoaXMuX19yZXNvdXJjZSBhcyBhbnkpLl9yZXNvdXJjZU5hbWU7XG4gICAgaWYgKG5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnUmVzb3VyY2UgbmFtZSBub3Qgc2V0LiBNYWtlIHN1cmUgdG8gYWRkIHRoZSByZXNvdXJjZSB0byB0aGUgcmVzb3VyY2VzIG9iamVjdCBpbiB5b3VyIGNvbmZpZy4gJyArXG4gICAgICAgICAgJ1RoZSByZXNvdXJjZSBuYW1lIGlzIGF1dG9tYXRpY2FsbHkgZGVyaXZlZCBmcm9tIHRoZSBvYmplY3Qga2V5LidcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlKCk7XG4gIH1cblxuICB0b0pTT04oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlKCk7XG4gIH1cblxuICB2YWx1ZU9mKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZSgpO1xuICB9XG59XG5cbi8qKlxuICogQSByZWZlcmVuY2UgdG8gYSByZXNvdXJjZSBwYXJhbWV0ZXIgdGhhdCB3aWxsIGJlIHJlc29sdmVkIGF0IHJ1bnRpbWUuXG4gKiBTdG9yZXMgYSByZWZlcmVuY2UgdG8gdGhlIHJlc291cmNlIGZvciBsYXp5IG5hbWUgcmVzb2x1dGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc291cmNlUGFyYW1SZWZlcmVuY2Uge1xuICBwcml2YXRlIF9fcmVzb3VyY2U6IEJhc2VSZXNvdXJjZTtcbiAgcHJpdmF0ZSBfX3BhcmFtOiBzdHJpbmc7XG4gIHJlYWRvbmx5IFtyZXNvdXJjZVBhcmFtUmVmU3ltYm9sXSA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IocmVzb3VyY2U6IEJhc2VSZXNvdXJjZSwgcGFyYW06IHN0cmluZykge1xuICAgIHRoaXMuX19yZXNvdXJjZSA9IHJlc291cmNlO1xuICAgIHRoaXMuX19wYXJhbSA9IHBhcmFtO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCRSZXNvdXJjZVBhcmFtKCcke3RoaXMuX19yZXNvdXJjZS5yZXNvdXJjZU5hbWV9JywgJyR7dGhpcy5fX3BhcmFtfScpYDtcbiAgfVxuXG4gIHRvSlNPTigpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG4gIH1cblxuICAvLyBBbGxvdyB0aGUgcmVmZXJlbmNlIHRvIGJlIHVzZWQgZGlyZWN0bHkgaW4gdGVtcGxhdGUgc3RyaW5nc1xuICB2YWx1ZU9mKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcbiAgfVxufVxuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIHR5cGUvcHJvcGVydGllcyBzdHJ1Y3R1cmVzIChlbmdpbmVzLCBwYWNrYWdpbmcsIGV2ZW50cywgZXRjLilcbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2VUeXBlUHJvcGVydGllcyB7XG4gIHB1YmxpYyByZWFkb25seSB0eXBlOiBzdHJpbmc7XG4gIHB1YmxpYyByZWFkb25seSBwcm9wZXJ0aWVzOiBhbnk7XG4gIHJlYWRvbmx5IFtiYXNlVHlwZVByb3BlcnRpZXNTeW1ib2xdID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3Rvcih0eXBlOiBzdHJpbmcsIHByb3BlcnRpZXM6IGFueSkge1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy5wcm9wZXJ0aWVzID0gcHJvcGVydGllcztcbiAgfVxufVxuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIHR5cGUtb25seSBzdHJ1Y3R1cmVzIChubyBwcm9wZXJ0aWVzIGZpZWxkLCBqdXN0IHR5cGUgZGlzY3JpbWluYXRvcilcbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2VUeXBlT25seSB7XG4gIHB1YmxpYyByZWFkb25seSB0eXBlOiBzdHJpbmc7XG4gIHJlYWRvbmx5IFtiYXNlVHlwZVByb3BlcnRpZXNTeW1ib2xdID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3Rvcih0eXBlOiBzdHJpbmcpIHtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICB9XG59XG5cbi8qKlxuICogRGVmaW5lcyBhIENsb3VkV2F0Y2ggYWxhcm0gdGhhdCBtb25pdG9ycyBhIG1ldHJpYyBhbmQgdHJpZ2dlcnMgbm90aWZpY2F0aW9ucyB3aGVuIHRocmVzaG9sZHMgYXJlIGJyZWFjaGVkLlxuICpcbiAqIEFsYXJtcyBjYW4gYmUgYXR0YWNoZWQgdG8gcmVzb3VyY2VzIGxpa2UgTGFtYmRhIGZ1bmN0aW9ucywgZGF0YWJhc2VzLCBsb2FkIGJhbGFuY2VycywgU1FTIHF1ZXVlcywgYW5kIEhUVFAgQVBJIEdhdGV3YXlzLlxuICogV2hlbiB0aGUgYWxhcm0gY29uZGl0aW9uIGlzIG1ldCAoZS5nLiwgZXJyb3IgcmF0ZSBleGNlZWRzIDUlKSwgbm90aWZpY2F0aW9ucyBhcmUgc2VudCB0byBjb25maWd1cmVkIHRhcmdldHMgKFNsYWNrLCBlbWFpbCwgTVMgVGVhbXMpLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogbmV3IEFsYXJtKHtcbiAqICAgdHJpZ2dlcjogbmV3IExhbWJkYUVycm9yUmF0ZVRyaWdnZXIoeyB0aHJlc2hvbGRQZXJjZW50OiA1IH0pLFxuICogICBldmFsdWF0aW9uOiB7IHBlcmlvZDogNjAsIGV2YWx1YXRpb25QZXJpb2RzOiAzLCBicmVhY2hlZFBlcmlvZHM6IDIgfSxcbiAqICAgbm90aWZpY2F0aW9uVGFyZ2V0czogW3sgc2xhY2s6IHsgdXJsOiAkU2VjcmV0KCdzbGFjay13ZWJob29rLXVybCcpIH0gfV0sXG4gKiAgIGRlc2NyaXB0aW9uOiAnTGFtYmRhIGVycm9yIHJhdGUgZXhjZWVkZWQgNSUnXG4gKiB9KVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBBbGFybSB7XG4gIHJlYWRvbmx5IFthbGFybVN5bWJvbF0gPSB0cnVlO1xuICBwdWJsaWMgcmVhZG9ubHkgdHJpZ2dlcjogYW55O1xuICBwdWJsaWMgcmVhZG9ubHkgZXZhbHVhdGlvbj86IGFueTtcbiAgcHVibGljIHJlYWRvbmx5IG5vdGlmaWNhdGlvblRhcmdldHM/OiBhbnlbXTtcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByb3BzOiB7IHRyaWdnZXI6IGFueTsgZXZhbHVhdGlvbj86IGFueTsgbm90aWZpY2F0aW9uVGFyZ2V0cz86IGFueVtdOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9KSB7XG4gICAgdGhpcy50cmlnZ2VyID0gcHJvcHMudHJpZ2dlcjtcbiAgICB0aGlzLmV2YWx1YXRpb24gPSBwcm9wcy5ldmFsdWF0aW9uO1xuICAgIHRoaXMubm90aWZpY2F0aW9uVGFyZ2V0cyA9IHByb3BzLm5vdGlmaWNhdGlvblRhcmdldHM7XG4gICAgdGhpcy5kZXNjcmlwdGlvbiA9IHByb3BzLmRlc2NyaXB0aW9uO1xuICB9XG59XG5cbi8qKlxuICogQmFzZSByZXNvdXJjZSBjbGFzcyB0aGF0IHByb3ZpZGVzIGNvbW1vbiBmdW5jdGlvbmFsaXR5XG4gKi9cbmV4cG9ydCBjbGFzcyBCYXNlUmVzb3VyY2Uge1xuICBwcml2YXRlIHJlYWRvbmx5IF90eXBlOiBzdHJpbmc7XG4gIHByaXZhdGUgX3Byb3BlcnRpZXM6IGFueTtcbiAgcHJpdmF0ZSBfb3ZlcnJpZGVzPzogYW55O1xuICBwcml2YXRlIF90cmFuc2Zvcm1zPzogYW55O1xuICBwcml2YXRlIF9yZXNvdXJjZU5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfZXhwbGljaXROYW1lOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgdHlwZTogc3RyaW5nLCBwcm9wZXJ0aWVzOiBhbnksIG92ZXJyaWRlcz86IGFueSkge1xuICAgIHRoaXMuX3Jlc291cmNlTmFtZSA9IG5hbWU7XG4gICAgdGhpcy5fZXhwbGljaXROYW1lID0gbmFtZSAhPT0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuXG4gICAgLy8gU3RvcmUgcHJvcGVydGllcyBhbmQgb3ZlcnJpZGVzIGluaXRpYWxseSAtIHRoZXknbGwgYmUgcHJvY2Vzc2VkIHdoZW4gbmFtZSBpcyBzZXRcbiAgICB0aGlzLl9wcm9wZXJ0aWVzID0gcHJvcGVydGllcztcbiAgICB0aGlzLl9vdmVycmlkZXMgPSBvdmVycmlkZXM7XG5cbiAgICAvLyBJZiBuYW1lIGlzIGFscmVhZHkgc2V0LCBwcm9jZXNzIG92ZXJyaWRlcyBhbmQgdHJhbnNmb3JtcyBub3dcbiAgICBpZiAobmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9wcm9jZXNzT3ZlcnJpZGVzQW5kVHJhbnNmb3JtcygpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIG92ZXJyaWRlcyBhbmQgdHJhbnNmb3JtcyBleHRyYWN0aW9uIGZyb20gcHJvcGVydGllcy5cbiAgICogQ2FsbGVkIHdoZW4gdGhlIHJlc291cmNlIG5hbWUgaXMgYXZhaWxhYmxlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcHJvY2Vzc092ZXJyaWRlc0FuZFRyYW5zZm9ybXMoKTogdm9pZCB7XG4gICAgY29uc3QgcHJvcGVydGllcyA9IHRoaXMuX3Byb3BlcnRpZXM7XG4gICAgaWYgKHByb3BlcnRpZXMgJiYgdHlwZW9mIHByb3BlcnRpZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBDbG9uZSBwcm9wZXJ0aWVzIHdpdGhvdXQgb3ZlcnJpZGVzIGFuZCB0cmFuc2Zvcm1zXG4gICAgICBjb25zdCBmaW5hbFByb3BlcnRpZXMgPSB7IC4uLnByb3BlcnRpZXMgfTtcblxuICAgICAgLy8gSGFuZGxlIG92ZXJyaWRlcyBmcm9tIHByb3BlcnRpZXMgKGlmIHRoZXkgd2VyZW4ndCBleHRyYWN0ZWQgYnkgY2hpbGQgY2xhc3MpXG4gICAgICBpZiAoJ292ZXJyaWRlcycgaW4gZmluYWxQcm9wZXJ0aWVzKSB7XG4gICAgICAgIGNvbnN0IHByb3BlcnRpZXNPdmVycmlkZXMgPSBmaW5hbFByb3BlcnRpZXMub3ZlcnJpZGVzO1xuICAgICAgICBkZWxldGUgZmluYWxQcm9wZXJ0aWVzLm92ZXJyaWRlcztcblxuICAgICAgICAvLyBUcmFuc2Zvcm0gb3ZlcnJpZGVzIHVzaW5nIGNmTG9naWNhbE5hbWVzXG4gICAgICAgIGlmIChwcm9wZXJ0aWVzT3ZlcnJpZGVzICYmIHR5cGVvZiBwcm9wZXJ0aWVzT3ZlcnJpZGVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIHRoaXMuX292ZXJyaWRlcyA9IHRyYW5zZm9ybU92ZXJyaWRlc1RvTG9naWNhbE5hbWVzKHRoaXMuX3Jlc291cmNlTmFtZSEsIHRoaXMuX3R5cGUsIHByb3BlcnRpZXNPdmVycmlkZXMpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEhhbmRsZSB0cmFuc2Zvcm1zIGZyb20gcHJvcGVydGllcyAoaWYgdGhleSB3ZXJlbid0IGV4dHJhY3RlZCBieSBjaGlsZCBjbGFzcylcbiAgICAgIGlmICgndHJhbnNmb3JtcycgaW4gZmluYWxQcm9wZXJ0aWVzKSB7XG4gICAgICAgIGNvbnN0IHByb3BlcnRpZXNUcmFuc2Zvcm1zID0gZmluYWxQcm9wZXJ0aWVzLnRyYW5zZm9ybXM7XG4gICAgICAgIGRlbGV0ZSBmaW5hbFByb3BlcnRpZXMudHJhbnNmb3JtcztcblxuICAgICAgICAvLyBUcmFuc2Zvcm0gdHJhbnNmb3JtcyB1c2luZyBjZkxvZ2ljYWxOYW1lcyAoc2FtZSBtYXBwaW5nIGFzIG92ZXJyaWRlcylcbiAgICAgICAgaWYgKHByb3BlcnRpZXNUcmFuc2Zvcm1zICYmIHR5cGVvZiBwcm9wZXJ0aWVzVHJhbnNmb3JtcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICB0aGlzLl90cmFuc2Zvcm1zID0gdHJhbnNmb3JtVHJhbnNmb3Jtc1RvTG9naWNhbE5hbWVzKHRoaXMuX3Jlc291cmNlTmFtZSEsIHRoaXMuX3R5cGUsIHByb3BlcnRpZXNUcmFuc2Zvcm1zKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLl9wcm9wZXJ0aWVzID0gZmluYWxQcm9wZXJ0aWVzO1xuICAgIH1cblxuICAgIC8vIEFsc28gdHJhbnNmb3JtIG92ZXJyaWRlcy90cmFuc2Zvcm1zIHRoYXQgd2VyZSBwYXNzZWQgZGlyZWN0bHkgdmlhIGNvbnN0cnVjdG9yXG4gICAgLy8gKHdoZW4gY2hpbGQgY2xhc3MgZXh0cmFjdHMgdGhlbSBiZWZvcmUgY2FsbGluZyBzdXBlcilcbiAgICBpZiAodGhpcy5fb3ZlcnJpZGVzICYmIHR5cGVvZiB0aGlzLl9vdmVycmlkZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICB0aGlzLl9vdmVycmlkZXMgPSB0cmFuc2Zvcm1PdmVycmlkZXNUb0xvZ2ljYWxOYW1lcyh0aGlzLl9yZXNvdXJjZU5hbWUhLCB0aGlzLl90eXBlLCB0aGlzLl9vdmVycmlkZXMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fdHJhbnNmb3JtcyAmJiB0eXBlb2YgdGhpcy5fdHJhbnNmb3JtcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHRoaXMuX3RyYW5zZm9ybXMgPSB0cmFuc2Zvcm1UcmFuc2Zvcm1zVG9Mb2dpY2FsTmFtZXModGhpcy5fcmVzb3VyY2VOYW1lISwgdGhpcy5fdHlwZSwgdGhpcy5fdHJhbnNmb3Jtcyk7XG4gICAgfVxuICB9XG5cbiAgLy8gUHVibGljIGdldHRlciBmb3IgcmVzb3VyY2UgbmFtZSAodXNlZCBmb3IgcmVmZXJlbmNpbmcgcmVzb3VyY2VzKVxuICAvLyBSZXR1cm5zIGEgZGVmZXJyZWQgcmVmZXJlbmNlIHdoZW4gbmFtZSBpc24ndCBzZXQgeWV0LCB3aGljaCByZXNvbHZlcyBkdXJpbmcgdHJhbnNmb3JtYXRpb25cbiAgZ2V0IHJlc291cmNlTmFtZSgpOiBzdHJpbmcge1xuICAgIGlmICh0aGlzLl9yZXNvdXJjZU5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gUmV0dXJuIGEgZGVmZXJyZWQgcmVmZXJlbmNlIHRoYXQgd2lsbCByZXNvbHZlIGR1cmluZyB0cmFuc2Zvcm1hdGlvblxuICAgICAgLy8gVHlwZVNjcmlwdCBzZWVzIHRoaXMgYXMgc3RyaW5nIGR1ZSB0byB0b1N0cmluZy92YWx1ZU9mLCBydW50aW1lIHJlc29sdmVzIGxhemlseVxuICAgICAgcmV0dXJuIG5ldyBEZWZlcnJlZFJlc291cmNlTmFtZSh0aGlzKSBhcyB1bmtub3duIGFzIHN0cmluZztcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3Jlc291cmNlTmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBtZXRob2QgdG8gc2V0IHRoZSByZXNvdXJjZSBuYW1lIGZyb20gdGhlIG9iamVjdCBrZXkuXG4gICAqIENhbGxlZCBieSB0cmFuc2Zvcm1Db25maWdXaXRoUmVzb3VyY2VzLlxuICAgKi9cbiAgW3NldFJlc291cmNlTmFtZVN5bWJvbF0obmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX2V4cGxpY2l0TmFtZSAmJiB0aGlzLl9yZXNvdXJjZU5hbWUgIT09IG5hbWUpIHtcbiAgICAgIC8vIElmIGFuIGV4cGxpY2l0IG5hbWUgd2FzIHByb3ZpZGVkIGFuZCBpdCBkaWZmZXJzIGZyb20gdGhlIGtleSwgdXNlIHRoZSBleHBsaWNpdCBuYW1lXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLl9yZXNvdXJjZU5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fcmVzb3VyY2VOYW1lID0gbmFtZTtcbiAgICAgIC8vIE5vdyB0aGF0IHdlIGhhdmUgYSBuYW1lLCBwcm9jZXNzIG92ZXJyaWRlcyBhbmQgdHJhbnNmb3Jtc1xuICAgICAgdGhpcy5fcHJvY2Vzc092ZXJyaWRlc0FuZFRyYW5zZm9ybXMoKTtcbiAgICB9XG4gIH1cblxuICAvLyBQcml2YXRlIG1ldGhvZHMgdXNpbmcgc3ltYm9scyAtIG5vdCBhY2Nlc3NpYmxlIGZyb20gb3V0c2lkZSBvciBpbiBhdXRvY29tcGxldGVcbiAgW2dldFBhcmFtUmVmZXJlbmNlU3ltYm9sXShwYXJhbU5hbWU6IHN0cmluZyk6IFJlc291cmNlUGFyYW1SZWZlcmVuY2Uge1xuICAgIHJldHVybiBuZXcgUmVzb3VyY2VQYXJhbVJlZmVyZW5jZSh0aGlzLCBwYXJhbU5hbWUpO1xuICB9XG5cbiAgW2dldFR5cGVTeW1ib2xdKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3R5cGU7XG4gIH1cblxuICBbZ2V0UHJvcGVydGllc1N5bWJvbF0oKTogYW55IHtcbiAgICByZXR1cm4gdGhpcy5fcHJvcGVydGllcztcbiAgfVxuXG4gIFtnZXRPdmVycmlkZXNTeW1ib2xdKCk6IGFueSB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX292ZXJyaWRlcztcbiAgfVxuXG4gIFtnZXRUcmFuc2Zvcm1zU3ltYm9sXSgpOiBhbnkgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl90cmFuc2Zvcm1zO1xuICB9XG59XG5cbi8qKlxuICogRmxhdHRlbiBuZXN0ZWQgb2JqZWN0cyBpbnRvIGRvdC1ub3RhdGlvbiBwYXRocy5cbiAqIEUuZy4sIHsgU21zQ29uZmlndXJhdGlvbjogeyBFeHRlcm5hbElkOiAndmFsdWUnIH0gfSBiZWNvbWVzIHsgJ1Ntc0NvbmZpZ3VyYXRpb24uRXh0ZXJuYWxJZCc6ICd2YWx1ZScgfVxuICogUHJlc2VydmVzIGFycmF5cywgbm9uLXBsYWluIG9iamVjdHMsIGFuZCBtYXAtbGlrZSBvYmplY3RzIHdpdGggc3BlY2lhbCBrZXlzIGFzIGxlYWYgdmFsdWVzLlxuICovXG5mdW5jdGlvbiBmbGF0dGVuVG9Eb3ROb3RhdGlvbihvYmo6IGFueSwgcHJlZml4ID0gJycpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG5cbiAgZm9yIChjb25zdCBrZXkgaW4gb2JqKSB7XG4gICAgY29uc3QgdmFsdWUgPSBvYmpba2V5XTtcbiAgICBjb25zdCBuZXdLZXkgPSBwcmVmaXggPyBgJHtwcmVmaXh9LiR7a2V5fWAgOiBrZXk7XG5cbiAgICAvLyBDaGVjayBpZiB2YWx1ZSBpcyBhIHBsYWluIG9iamVjdCAobm90IGFycmF5LCBub3QgbnVsbCwgbm90IHNwZWNpYWwgdHlwZXMpXG4gICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmNvbnN0cnVjdG9yID09PSBPYmplY3QpIHtcbiAgICAgIC8vIFByZXNlcnZlIG1hcC1saWtlIG9iamVjdHMgd2l0aCBub24tcGF0aC1zYWZlIGtleXMgKGZvciBleGFtcGxlXG4gICAgICAvLyBSRFMgcGFyYW1ldGVyIG5hbWVzIGxpa2UgXCJyZHMuYWxsb3dlZF9leHRlbnNpb25zXCIgb3IgT3BlblNlYXJjaCBvcHRpb25zKS5cbiAgICAgIC8vIFRoaXMgcHJldmVudHMgc3BsaXR0aW5nIGxpdGVyYWwga2V5cyBpbnRvIG5lc3RlZCBwYXRocyBsYXRlci5cbiAgICAgIGlmIChPYmplY3Qua2V5cyh2YWx1ZSkuc29tZSgoY2hpbGRLZXkpID0+ICEvXltBLVphLXowLTlfXSskLy50ZXN0KGNoaWxkS2V5KSkpIHtcbiAgICAgICAgcmVzdWx0W25ld0tleV0gPSB2YWx1ZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBSZWN1cnNpdmVseSBmbGF0dGVuIG5lc3RlZCBvYmplY3RzXG4gICAgICBPYmplY3QuYXNzaWduKHJlc3VsdCwgZmxhdHRlblRvRG90Tm90YXRpb24odmFsdWUsIG5ld0tleSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBMZWFmIHZhbHVlIC0ga2VlcCBhcyBpc1xuICAgICAgcmVzdWx0W25ld0tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSB1c2VyLWZyaWVuZGx5IG92ZXJyaWRlcyAod2l0aCBwcm9wZXJ0eSBuYW1lcyBsaWtlICdidWNrZXQnLCAnbGFtYmRhTG9nR3JvdXAnKVxuICogdG8gQ2xvdWRGb3JtYXRpb24gbG9naWNhbCBuYW1lcyB1c2luZyBjZkxvZ2ljYWxOYW1lc1xuICovXG5mdW5jdGlvbiB0cmFuc2Zvcm1PdmVycmlkZXNUb0xvZ2ljYWxOYW1lcyhyZXNvdXJjZU5hbWU6IHN0cmluZywgcmVzb3VyY2VUeXBlOiBzdHJpbmcsIG92ZXJyaWRlczogYW55KTogYW55IHtcbiAgLy8gR2V0IGNoaWxkIHJlc291cmNlcyBmb3IgdGhpcyByZXNvdXJjZSB0eXBlXG4gIGNvbnN0IGNoaWxkUmVzb3VyY2VzID0gQ0hJTERfUkVTT1VSQ0VTW3Jlc291cmNlVHlwZV0gfHwgW107XG5cbiAgLy8gQnVpbGQgYSBtYXAgb2YgcHJvcGVydHkgbmFtZXMgdG8gY2hpbGQgcmVzb3VyY2VzXG4gIGNvbnN0IHByb3BlcnR5TmFtZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBhbnk+KCk7XG5cbiAgZm9yIChjb25zdCBjaGlsZFJlc291cmNlIG9mIGNoaWxkUmVzb3VyY2VzKSB7XG4gICAgLy8gVGhlIGxvZ2ljYWxOYW1lIGZ1bmN0aW9uIGhhcyBhIG5hbWUgcHJvcGVydHkgdGhhdCBtYXRjaGVzIHRoZSBwcm9wZXJ0eSBuYW1lXG4gICAgaWYgKGNoaWxkUmVzb3VyY2UubG9naWNhbE5hbWUgJiYgY2hpbGRSZXNvdXJjZS5sb2dpY2FsTmFtZS5uYW1lKSB7XG4gICAgICBwcm9wZXJ0eU5hbWVNYXAuc2V0KGNoaWxkUmVzb3VyY2UubG9naWNhbE5hbWUubmFtZSwgY2hpbGRSZXNvdXJjZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gVHJhbnNmb3JtIG92ZXJyaWRlcyBvYmplY3RcbiAgY29uc3QgdHJhbnNmb3JtZWRPdmVycmlkZXM6IGFueSA9IHt9O1xuICBjb25zdCBlcnJvck1lc3NhZ2UgPSBgT3ZlcnJpZGUgb2YgcHJvcGVydHkge3Byb3BlcnR5TmFtZX0gb2YgcmVzb3VyY2UgJHtyZXNvdXJjZU5hbWV9IGlzIG5vdCBzdXBwb3J0ZWQuXFxuXG5SZW1vdmUgdGhlIG92ZXJyaWRlLCBydW4gJ3N0YWNrdGFwZSBjb21waWxlOnRlbXBsYXRlJyBjb21tYW5kLCBhbmQgZmluZCB0aGUgbG9naWNhbCBuYW1lIG9mIHRoZSByZXNvdXJjZSB5b3Ugd2FudCB0byBvdmVycmlkZSBtYW51YWxseS4gVGhlbiBhZGQgaXQgdG8gdGhlIG92ZXJyaWRlcyBvYmplY3QuYDtcblxuICBmb3IgKGNvbnN0IHByb3BlcnR5TmFtZSBpbiBvdmVycmlkZXMpIHtcbiAgICBjb25zdCBjaGlsZFJlc291cmNlID0gcHJvcGVydHlOYW1lTWFwLmdldChwcm9wZXJ0eU5hbWUpO1xuXG4gICAgLy8gU2tpcCB1bnJlc29sdmFibGUgcmVzb3VyY2VzXG4gICAgaWYgKGNoaWxkUmVzb3VyY2U/LnVucmVzb2x2YWJsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yTWVzc2FnZS5yZXBsYWNlKCd7cHJvcGVydHlOYW1lfScsIHByb3BlcnR5TmFtZSkpO1xuICAgIH1cblxuICAgIGlmIChjaGlsZFJlc291cmNlKSB7XG4gICAgICBjb25zdCBsb2dpY2FsTmFtZUZuID0gY2hpbGRSZXNvdXJjZS5sb2dpY2FsTmFtZTtcbiAgICAgIC8vIENhbGwgdGhlIGNmTG9naWNhbE5hbWVzIGZ1bmN0aW9uIHRvIGdldCB0aGUgYWN0dWFsIENsb3VkRm9ybWF0aW9uIGxvZ2ljYWwgbmFtZVxuICAgICAgLy8gVHJ5IHdpdGggcmVzb3VyY2VOYW1lIGZpcnN0IChtb3N0IGNvbW1vbiksIHRoZW4gdHJ5IHdpdGhvdXQgYXJndW1lbnRzXG4gICAgICBsZXQgbG9naWNhbE5hbWU6IHN0cmluZztcbiAgICAgIHRyeSB7XG4gICAgICAgIGxvZ2ljYWxOYW1lID0gbG9naWNhbE5hbWVGbihyZXNvdXJjZU5hbWUpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbG9naWNhbE5hbWUgPSBsb2dpY2FsTmFtZUZuKCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIElmIGJvdGggZmFpbCwgdXNlIHByb3BlcnR5IG5hbWUgYXMtaXNcbiAgICAgICAgICBsb2dpY2FsTmFtZSA9IHByb3BlcnR5TmFtZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGxvZ2ljYWxOYW1lLmluY2x1ZGVzKCd1bmRlZmluZWQnKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNZXNzYWdlLnJlcGxhY2UoJ3twcm9wZXJ0eU5hbWV9JywgcHJvcGVydHlOYW1lKSk7XG4gICAgICB9XG4gICAgICAvLyBXaGVuIHVzaW5nIFNESyBwcm9wZXJ0eSBuYW1lcywgZmxhdHRlbiBuZXN0ZWQgb2JqZWN0cyB0byBkb3Qtbm90YXRpb25cbiAgICAgIC8vIHNvIHsgU21zQ29uZmlndXJhdGlvbjogeyBFeHRlcm5hbElkOiAneCcgfSB9IGJlY29tZXMgeyAnU21zQ29uZmlndXJhdGlvbi5FeHRlcm5hbElkJzogJ3gnIH1cbiAgICAgIGNvbnN0IG92ZXJyaWRlVmFsdWUgPSBvdmVycmlkZXNbcHJvcGVydHlOYW1lXTtcbiAgICAgIGlmICghdHJhbnNmb3JtZWRPdmVycmlkZXNbbG9naWNhbE5hbWVdKSB7XG4gICAgICAgIHRyYW5zZm9ybWVkT3ZlcnJpZGVzW2xvZ2ljYWxOYW1lXSA9IHt9O1xuICAgICAgfVxuICAgICAgT2JqZWN0LmFzc2lnbih0cmFuc2Zvcm1lZE92ZXJyaWRlc1tsb2dpY2FsTmFtZV0sIGZsYXR0ZW5Ub0RvdE5vdGF0aW9uKG92ZXJyaWRlVmFsdWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgbm90IGZvdW5kIGluIG1hcCwgdXNlIHByb3BlcnR5IG5hbWUgYXMtaXMgKENGIGxvZ2ljYWwgbmFtZSB1c2VkIGRpcmVjdGx5KVxuICAgICAgLy8gRG9uJ3QgZmxhdHRlbiAtIHVzZXIgaXMgdXNpbmcgQ0YgbG9naWNhbCBuYW1lcyBhbmQgbWF5IHdhbnQgZnVsbCBvYmplY3QgcmVwbGFjZW1lbnRcbiAgICAgIHRyYW5zZm9ybWVkT3ZlcnJpZGVzW3Byb3BlcnR5TmFtZV0gPSBvdmVycmlkZXNbcHJvcGVydHlOYW1lXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJhbnNmb3JtZWRPdmVycmlkZXM7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIHVzZXItZnJpZW5kbHkgdHJhbnNmb3JtcyAod2l0aCBwcm9wZXJ0eSBuYW1lcyBsaWtlICdsYW1iZGEnLCAnbGFtYmRhTG9nR3JvdXAnKVxuICogdG8gQ2xvdWRGb3JtYXRpb24gbG9naWNhbCBuYW1lcyB1c2luZyBjZkxvZ2ljYWxOYW1lc1xuICogU2ltaWxhciB0byBvdmVycmlkZXMgYnV0IHRoZSB2YWx1ZXMgYXJlIGZ1bmN0aW9ucyBpbnN0ZWFkIG9mIG9iamVjdHNcbiAqL1xuZnVuY3Rpb24gdHJhbnNmb3JtVHJhbnNmb3Jtc1RvTG9naWNhbE5hbWVzKHJlc291cmNlTmFtZTogc3RyaW5nLCByZXNvdXJjZVR5cGU6IHN0cmluZywgdHJhbnNmb3JtczogYW55KTogYW55IHtcbiAgLy8gR2V0IGNoaWxkIHJlc291cmNlcyBmb3IgdGhpcyByZXNvdXJjZSB0eXBlXG4gIGNvbnN0IGNoaWxkUmVzb3VyY2VzID0gQ0hJTERfUkVTT1VSQ0VTW3Jlc291cmNlVHlwZV0gfHwgW107XG5cbiAgLy8gQnVpbGQgYSBtYXAgb2YgcHJvcGVydHkgbmFtZXMgdG8gY2hpbGQgcmVzb3VyY2VzXG4gIGNvbnN0IHByb3BlcnR5TmFtZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBhbnk+KCk7XG5cbiAgZm9yIChjb25zdCBjaGlsZFJlc291cmNlIG9mIGNoaWxkUmVzb3VyY2VzKSB7XG4gICAgLy8gVGhlIGxvZ2ljYWxOYW1lIGZ1bmN0aW9uIGhhcyBhIG5hbWUgcHJvcGVydHkgdGhhdCBtYXRjaGVzIHRoZSBwcm9wZXJ0eSBuYW1lXG4gICAgaWYgKGNoaWxkUmVzb3VyY2UubG9naWNhbE5hbWUgJiYgY2hpbGRSZXNvdXJjZS5sb2dpY2FsTmFtZS5uYW1lKSB7XG4gICAgICBwcm9wZXJ0eU5hbWVNYXAuc2V0KGNoaWxkUmVzb3VyY2UubG9naWNhbE5hbWUubmFtZSwgY2hpbGRSZXNvdXJjZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gVHJhbnNmb3JtIHRyYW5zZm9ybXMgb2JqZWN0XG4gIGNvbnN0IHRyYW5zZm9ybWVkVHJhbnNmb3JtczogYW55ID0ge307XG4gIGNvbnN0IGVycm9yTWVzc2FnZSA9IGBUcmFuc2Zvcm0gb2YgcHJvcGVydHkge3Byb3BlcnR5TmFtZX0gb2YgcmVzb3VyY2UgJHtyZXNvdXJjZU5hbWV9IGlzIG5vdCBzdXBwb3J0ZWQuXFxuXG5SZW1vdmUgdGhlIHRyYW5zZm9ybSwgcnVuICdzdGFja3RhcGUgY29tcGlsZTp0ZW1wbGF0ZScgY29tbWFuZCwgYW5kIGZpbmQgdGhlIGxvZ2ljYWwgbmFtZSBvZiB0aGUgcmVzb3VyY2UgeW91IHdhbnQgdG8gdHJhbnNmb3JtIG1hbnVhbGx5LiBUaGVuIGFkZCBpdCB0byB0aGUgdHJhbnNmb3JtcyBvYmplY3QuYDtcblxuICBmb3IgKGNvbnN0IHByb3BlcnR5TmFtZSBpbiB0cmFuc2Zvcm1zKSB7XG4gICAgY29uc3QgY2hpbGRSZXNvdXJjZSA9IHByb3BlcnR5TmFtZU1hcC5nZXQocHJvcGVydHlOYW1lKTtcblxuICAgIC8vIFNraXAgdW5yZXNvbHZhYmxlIHJlc291cmNlc1xuICAgIGlmIChjaGlsZFJlc291cmNlPy51bnJlc29sdmFibGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvck1lc3NhZ2UucmVwbGFjZSgne3Byb3BlcnR5TmFtZX0nLCBwcm9wZXJ0eU5hbWUpKTtcbiAgICB9XG5cbiAgICBpZiAoY2hpbGRSZXNvdXJjZSkge1xuICAgICAgY29uc3QgbG9naWNhbE5hbWVGbiA9IGNoaWxkUmVzb3VyY2UubG9naWNhbE5hbWU7XG4gICAgICAvLyBDYWxsIHRoZSBjZkxvZ2ljYWxOYW1lcyBmdW5jdGlvbiB0byBnZXQgdGhlIGFjdHVhbCBDbG91ZEZvcm1hdGlvbiBsb2dpY2FsIG5hbWVcbiAgICAgIC8vIFRyeSB3aXRoIHJlc291cmNlTmFtZSBmaXJzdCAobW9zdCBjb21tb24pLCB0aGVuIHRyeSB3aXRob3V0IGFyZ3VtZW50c1xuICAgICAgbGV0IGxvZ2ljYWxOYW1lOiBzdHJpbmc7XG4gICAgICB0cnkge1xuICAgICAgICBsb2dpY2FsTmFtZSA9IGxvZ2ljYWxOYW1lRm4ocmVzb3VyY2VOYW1lKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGxvZ2ljYWxOYW1lID0gbG9naWNhbE5hbWVGbigpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBJZiBib3RoIGZhaWwsIHVzZSBwcm9wZXJ0eSBuYW1lIGFzLWlzXG4gICAgICAgICAgbG9naWNhbE5hbWUgPSBwcm9wZXJ0eU5hbWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChsb2dpY2FsTmFtZS5pbmNsdWRlcygndW5kZWZpbmVkJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yTWVzc2FnZS5yZXBsYWNlKCd7cHJvcGVydHlOYW1lfScsIHByb3BlcnR5TmFtZSkpO1xuICAgICAgfVxuICAgICAgdHJhbnNmb3JtZWRUcmFuc2Zvcm1zW2xvZ2ljYWxOYW1lXSA9IHRyYW5zZm9ybXNbcHJvcGVydHlOYW1lXTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgbm90IGZvdW5kIGluIG1hcCwgdXNlIHByb3BlcnR5IG5hbWUgYXMtaXMgKHNob3VsZG4ndCBoYXBwZW4gd2l0aCBwcm9wZXIgdHlwZXMpXG4gICAgICB0cmFuc2Zvcm1lZFRyYW5zZm9ybXNbcHJvcGVydHlOYW1lXSA9IHRyYW5zZm9ybXNbcHJvcGVydHlOYW1lXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJhbnNmb3JtZWRUcmFuc2Zvcm1zO1xufVxuXG5leHBvcnQgdHlwZSBHZXRDb25maWdQYXJhbXMgPSB7XG4gIC8qKlxuICAgKiBQcm9qZWN0IG5hbWUgdXNlZCBmb3IgdGhpcyBvcGVyYXRpb25cbiAgICovXG4gIHByb2plY3ROYW1lOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBTdGFnZSAoXCJlbnZpcm9ubWVudFwiKSB1c2VkIGZvciB0aGlzIG9wZXJhdGlvblxuICAgKi9cbiAgc3RhZ2U6IHN0cmluZztcbiAgLyoqXG4gICAqIEFXUyByZWdpb24gdXNlZCBmb3IgdGhpcyBvcGVyYXRpb25cbiAgICogVGhlIGxpc3Qgb2YgYXZhaWxhYmxlIHJlZ2lvbnMgaXMgYXZhaWxhYmxlIGF0IGh0dHBzOi8vd3d3LmF3cy1zZXJ2aWNlcy5pbmZvL3JlZ2lvbnMuaHRtbFxuICAgKi9cbiAgcmVnaW9uOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBMaXN0IG9mIGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIG9wZXJhdGlvblxuICAgKi9cbiAgY2xpQXJnczogU3RhY2t0YXBlQXJncztcbiAgLyoqXG4gICAqIFN0YWNrdGFwZSBjb21tYW5kIHVzZWQgdG8gcGVyZm9ybSB0aGlzIG9wZXJhdGlvbiAoY2FuIGJlIGVpdGhlciBkZXBsb3ksIGNvZGVidWlsZDpkZXBsb3ksIGRlbGV0ZSwgZXRjLilcbiAgICovXG4gIGNvbW1hbmQ6IHN0cmluZztcbiAgLyoqXG4gICAqIExvY2FsbHktY29uZmlndXJlZCBBV1MgcHJvZmlsZSB1c2VkIHRvIGV4ZWN1dGUgdGhlIG9wZXJhdGlvbi5cbiAgICogRG9lc24ndCBhcHBseSBpZiB5b3UgaGF2ZSB5b3VyIEFXUyBhY2NvdW50IGNvbm5lY3RlZCBpbiBcImF1dG9tYXRpY1wiIG1vZGUuXG4gICAqL1xuICBhd3NQcm9maWxlOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgdXNlciBwZXJmb3JtaW5nIHRoZSBzdGFjayBvcGVyYXRpb25cbiAgICovXG4gIHVzZXI6IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBlbWFpbDogc3RyaW5nO1xuICB9O1xufTtcblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gZGVmaW5lIGEgY29uZmlnIHdpdGggYXV0b21hdGljIHRyYW5zZm9ybWF0aW9uXG4gKiBVc2UgdGhpcyB3aGVuIGV4cG9ydGluZyB5b3VyIGNvbmZpZyBmb3IgdGhlIFN0YWNrdGFwZSBDTElcbiAqL1xuZXhwb3J0IGNvbnN0IGRlZmluZUNvbmZpZyA9IChjb25maWdGbjogKHBhcmFtczogR2V0Q29uZmlnUGFyYW1zKSA9PiBTdGFja3RhcGVDb25maWcpID0+IHtcbiAgcmV0dXJuIChwYXJhbXM6IEdldENvbmZpZ1BhcmFtcykgPT4ge1xuICAgIGNvbnN0IGNvbmZpZyA9IGNvbmZpZ0ZuKHBhcmFtcyk7XG4gICAgcmV0dXJuIHRyYW5zZm9ybUNvbmZpZ1dpdGhSZXNvdXJjZXMoY29uZmlnKTtcbiAgfTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtcyBhIGNvbmZpZyB3aXRoIHJlc291cmNlIGluc3RhbmNlcyBpbnRvIGEgcGxhaW4gY29uZmlnIG9iamVjdFxuICovXG5leHBvcnQgY29uc3QgdHJhbnNmb3JtQ29uZmlnV2l0aFJlc291cmNlcyA9IChjb25maWc6IGFueSk6IGFueSA9PiB7XG4gIGlmICghY29uZmlnIHx8IHR5cGVvZiBjb25maWcgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIC8vIEZpcnN0IHBhc3M6IHNldCBhbGwgcmVzb3VyY2UgbmFtZXMgZnJvbSBvYmplY3Qga2V5c1xuICAvLyBUaGlzIG11c3QgaGFwcGVuIGJlZm9yZSBhbnkgdHJhbnNmb3JtYXRpb24gc28gdGhhdCBSZXNvdXJjZVBhcmFtUmVmZXJlbmNlcyBjYW4gcmVzb2x2ZSBuYW1lc1xuICBpZiAoY29uZmlnLnJlc291cmNlcyAmJiB0eXBlb2YgY29uZmlnLnJlc291cmNlcyA9PT0gJ29iamVjdCcpIHtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBjb25maWcucmVzb3VyY2VzKSB7XG4gICAgICBjb25zdCByZXNvdXJjZSA9IGNvbmZpZy5yZXNvdXJjZXNba2V5XTtcbiAgICAgIGlmIChpc0Jhc2VSZXNvdXJjZShyZXNvdXJjZSkpIHtcbiAgICAgICAgKHJlc291cmNlIGFzIGFueSlbc2V0UmVzb3VyY2VOYW1lU3ltYm9sXShrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFNlY29uZCBwYXNzOiB0cmFuc2Zvcm0gdGhlIGNvbmZpZ1xuICBjb25zdCByZXN1bHQ6IGFueSA9IHt9O1xuICBmb3IgKGNvbnN0IGtleSBpbiBjb25maWcpIHtcbiAgICBpZiAoa2V5ID09PSAncmVzb3VyY2VzJykge1xuICAgICAgLy8gUmVzb3VyY2VzIGFyZSB0cmFuc2Zvcm1lZCBhcyBkZWZpbml0aW9uc1xuICAgICAgcmVzdWx0W2tleV0gPSB0cmFuc2Zvcm1SZXNvdXJjZURlZmluaXRpb25zKGNvbmZpZ1trZXldKTtcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gJ3NjcmlwdHMnKSB7XG4gICAgICAvLyBTY3JpcHRzIGFyZSBhbHNvIHRyYW5zZm9ybWVkIGFzIGRlZmluaXRpb25zXG4gICAgICByZXN1bHRba2V5XSA9IHRyYW5zZm9ybVNjcmlwdERlZmluaXRpb25zKGNvbmZpZ1trZXldKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0W2tleV0gPSB0cmFuc2Zvcm1WYWx1ZShjb25maWdba2V5XSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybXMgZW52aXJvbm1lbnQgb2JqZWN0IHRvIGFycmF5IGZvcm1hdFxuICovXG5jb25zdCB0cmFuc2Zvcm1FbnZpcm9ubWVudCA9IChlbnY6IGFueSk6IGFueSA9PiB7XG4gIGlmICghZW52IHx8IHR5cGVvZiBlbnYgIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkoZW52KSkge1xuICAgIHJldHVybiBlbnY7XG4gIH1cblxuICAvLyBDb252ZXJ0IHsgS0VZOiB2YWx1ZSB9IHRvIFt7IG5hbWU6ICdLRVknLCB2YWx1ZSB9XVxuICByZXR1cm4gT2JqZWN0LmVudHJpZXMoZW52KS5tYXAoKFtuYW1lLCB2YWx1ZV0pID0+ICh7XG4gICAgbmFtZSxcbiAgICB2YWx1ZTogdHJhbnNmb3JtVmFsdWUodmFsdWUpXG4gIH0pKTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtcyByZXNvdXJjZSBkZWZpbml0aW9ucyAodmFsdWVzIGluIHRoZSByZXNvdXJjZXMgb2JqZWN0KVxuICovXG5jb25zdCB0cmFuc2Zvcm1SZXNvdXJjZURlZmluaXRpb25zID0gKHJlc291cmNlczogYW55KTogYW55ID0+IHtcbiAgaWYgKCFyZXNvdXJjZXMgfHwgdHlwZW9mIHJlc291cmNlcyAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gcmVzb3VyY2VzO1xuICB9XG5cbiAgY29uc3QgcmVzdWx0OiBhbnkgPSB7fTtcbiAgZm9yIChjb25zdCBrZXkgaW4gcmVzb3VyY2VzKSB7XG4gICAgY29uc3QgcmVzb3VyY2UgPSByZXNvdXJjZXNba2V5XTtcbiAgICBpZiAoaXNCYXNlUmVzb3VyY2UocmVzb3VyY2UpKSB7XG4gICAgICBjb25zdCB0eXBlID0gKHJlc291cmNlIGFzIGFueSlbZ2V0VHlwZVN5bWJvbF0oKTtcbiAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSAocmVzb3VyY2UgYXMgYW55KVtnZXRQcm9wZXJ0aWVzU3ltYm9sXSgpO1xuICAgICAgY29uc3Qgb3ZlcnJpZGVzID0gKHJlc291cmNlIGFzIGFueSlbZ2V0T3ZlcnJpZGVzU3ltYm9sXSgpO1xuICAgICAgY29uc3QgdHJhbnNmb3JtcyA9IChyZXNvdXJjZSBhcyBhbnkpW2dldFRyYW5zZm9ybXNTeW1ib2xdKCk7XG4gICAgICByZXN1bHRba2V5XSA9IHtcbiAgICAgICAgdHlwZSxcbiAgICAgICAgcHJvcGVydGllczogdHJhbnNmb3JtVmFsdWUocHJvcGVydGllcyksXG4gICAgICAgIC4uLihvdmVycmlkZXMgIT09IHVuZGVmaW5lZCAmJiB7IG92ZXJyaWRlczogdHJhbnNmb3JtVmFsdWUob3ZlcnJpZGVzKSB9KSxcbiAgICAgICAgLi4uKHRyYW5zZm9ybXMgIT09IHVuZGVmaW5lZCAmJiB7IHRyYW5zZm9ybXMgfSlcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdFtrZXldID0gdHJhbnNmb3JtVmFsdWUocmVzb3VyY2UpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm1zIHNjcmlwdCBkZWZpbml0aW9ucyAodmFsdWVzIGluIHRoZSBzY3JpcHRzIG9iamVjdClcbiAqL1xuY29uc3QgdHJhbnNmb3JtU2NyaXB0RGVmaW5pdGlvbnMgPSAoc2NyaXB0czogYW55KTogYW55ID0+IHtcbiAgaWYgKCFzY3JpcHRzIHx8IHR5cGVvZiBzY3JpcHRzICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBzY3JpcHRzO1xuICB9XG5cbiAgY29uc3QgcmVzdWx0OiBhbnkgPSB7fTtcbiAgZm9yIChjb25zdCBrZXkgaW4gc2NyaXB0cykge1xuICAgIGNvbnN0IHNjcmlwdCA9IHNjcmlwdHNba2V5XTtcbiAgICBpZiAoaXNCYXNlVHlwZVByb3BlcnRpZXMoc2NyaXB0KSkge1xuICAgICAgcmVzdWx0W2tleV0gPSB7XG4gICAgICAgIHR5cGU6IHNjcmlwdC50eXBlLFxuICAgICAgICBwcm9wZXJ0aWVzOiB0cmFuc2Zvcm1WYWx1ZShzY3JpcHQucHJvcGVydGllcylcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdFtrZXldID0gdHJhbnNmb3JtVmFsdWUoc2NyaXB0KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbmV4cG9ydCBjb25zdCB0cmFuc2Zvcm1WYWx1ZSA9ICh2YWx1ZTogYW55KTogYW55ID0+IHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIGNvbnN0IHJld3JpdHRlbkRpcmVjdGl2ZSA9IHJld3JpdGVFbWJlZGRlZERpcmVjdGl2ZXNUb0NmRm9ybWF0KHZhbHVlKTtcbiAgICBpZiAocmV3cml0dGVuRGlyZWN0aXZlICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmV3cml0dGVuRGlyZWN0aXZlO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRyYW5zZm9ybSBEZWZlcnJlZFJlc291cmNlTmFtZSAtIHJlc29sdmUgdG8gYWN0dWFsIG5hbWVcbiAgaWYgKGlzRGVmZXJyZWRSZXNvdXJjZU5hbWUodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnJlc29sdmUoKTtcbiAgfVxuXG4gIC8vIFRyYW5zZm9ybSBSZXNvdXJjZVBhcmFtUmVmZXJlbmNlXG4gIGlmIChpc1Jlc291cmNlUGFyYW1SZWZlcmVuY2UodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG4gIH1cblxuICAvLyBUcmFuc2Zvcm0gQmFzZVJlc291cmNlIHJlZmVyZW5jZXMgKG5vdCBkZWZpbml0aW9ucykgdG8gcmVzb3VyY2VOYW1lXG4gIC8vIFRoaXMgaGFuZGxlcyBjYXNlcyBsaWtlIGNvbm5lY3RUbzogW2RhdGFiYXNlXVxuICBpZiAoaXNCYXNlUmVzb3VyY2UodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnJlc291cmNlTmFtZTtcbiAgfVxuXG4gIC8vIFRyYW5zZm9ybSBCYXNlVHlwZVByb3BlcnRpZXMgKGVuZ2luZXMsIHBhY2thZ2luZywgZXZlbnRzKSB0byBwbGFpbiBvYmplY3RcbiAgaWYgKGlzQmFzZVR5cGVQcm9wZXJ0aWVzKHZhbHVlKSkge1xuICAgIC8vIEhhbmRsZSB0eXBlLW9ubHkgY2xhc3NlcyAobm8gcHJvcGVydGllcylcbiAgICBpZiAoISgncHJvcGVydGllcycgaW4gdmFsdWUpIHx8IHZhbHVlLnByb3BlcnRpZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHsgdHlwZTogdmFsdWUudHlwZSB9O1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogdmFsdWUudHlwZSxcbiAgICAgIHByb3BlcnRpZXM6IHRyYW5zZm9ybVZhbHVlKHZhbHVlLnByb3BlcnRpZXMpXG4gICAgfTtcbiAgfVxuXG4gIC8vIFRyYW5zZm9ybSBBbGFybSBjbGFzcyB0byBwbGFpbiBvYmplY3RcbiAgaWYgKGlzQWxhcm0odmFsdWUpKSB7XG4gICAgY29uc3QgcmVzdWx0OiBhbnkgPSB7XG4gICAgICB0cmlnZ2VyOiB0cmFuc2Zvcm1WYWx1ZSh2YWx1ZS50cmlnZ2VyKVxuICAgIH07XG4gICAgaWYgKHZhbHVlLmV2YWx1YXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVzdWx0LmV2YWx1YXRpb24gPSB0cmFuc2Zvcm1WYWx1ZSh2YWx1ZS5ldmFsdWF0aW9uKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlLm5vdGlmaWNhdGlvblRhcmdldHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVzdWx0Lm5vdGlmaWNhdGlvblRhcmdldHMgPSB0cmFuc2Zvcm1WYWx1ZSh2YWx1ZS5ub3RpZmljYXRpb25UYXJnZXRzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlLmRlc2NyaXB0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlc3VsdC5kZXNjcmlwdGlvbiA9IHZhbHVlLmRlc2NyaXB0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gVHJhbnNmb3JtIGFycmF5c1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUubWFwKChpdGVtKSA9PiB7XG4gICAgICAvLyBJZiBpdCdzIGEgcmVzb3VyY2UgaW5zdGFuY2UgaW4gYW4gYXJyYXkgKGUuZy4sIGNvbm5lY3RUbyksIHRyYW5zZm9ybSB0byByZXNvdXJjZU5hbWVcbiAgICAgIGlmIChpc0Jhc2VSZXNvdXJjZShpdGVtKSkge1xuICAgICAgICByZXR1cm4gaXRlbS5yZXNvdXJjZU5hbWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJhbnNmb3JtVmFsdWUoaXRlbSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBUcmFuc2Zvcm0gb2JqZWN0c1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgIGNvbnN0IHJlc3VsdDogYW55ID0ge307XG4gICAgZm9yIChjb25zdCBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGVudmlyb25tZW50IGFuZCBpbmplY3RFbnZpcm9ubWVudCBwcm9wZXJ0aWVzXG4gICAgICBpZiAoa2V5ID09PSAnZW52aXJvbm1lbnQnIHx8IGtleSA9PT0gJ2luamVjdEVudmlyb25tZW50Jykge1xuICAgICAgICByZXN1bHRba2V5XSA9IHRyYW5zZm9ybUVudmlyb25tZW50KHZhbHVlW2tleV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB0cmFuc2Zvcm1WYWx1ZSh2YWx1ZVtrZXldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn07XG5cbmNvbnN0IFJVTlRJTUVfRElSRUNUSVZFX05BTUVTID0gbmV3IFNldChbJ1Jlc291cmNlUGFyYW0nLCAnQ2ZSZXNvdXJjZVBhcmFtJywgJ1NlY3JldCcsICdDZkZvcm1hdCcsICdDZlN0YWNrT3V0cHV0J10pO1xuXG5jb25zdCByZXdyaXRlRW1iZWRkZWREaXJlY3RpdmVzVG9DZkZvcm1hdCA9ICh2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCA9PiB7XG4gIGNvbnN0IGVtYmVkZGVkRGlyZWN0aXZlcyA9IGdldEVtYmVkZGVkRGlyZWN0aXZlcyh2YWx1ZSk7XG4gIGlmIChlbWJlZGRlZERpcmVjdGl2ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAoXG4gICAgZW1iZWRkZWREaXJlY3RpdmVzLmxlbmd0aCA9PT0gMSAmJlxuICAgIGVtYmVkZGVkRGlyZWN0aXZlc1swXS5zdGFydFBvcyA9PT0gMCAmJlxuICAgIGVtYmVkZGVkRGlyZWN0aXZlc1swXS5lbmRQb3MgPT09IHZhbHVlLmxlbmd0aFxuICApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGxldCBpbnRlcnBvbGF0ZWRTdHJpbmcgPSAnJztcbiAgbGV0IGN1cnJlbnRQb3MgPSAwO1xuICBlbWJlZGRlZERpcmVjdGl2ZXMuZm9yRWFjaCgoeyBzdGFydFBvcywgZW5kUG9zIH0pID0+IHtcbiAgICBpbnRlcnBvbGF0ZWRTdHJpbmcgKz0gYCR7dmFsdWUuc2xpY2UoY3VycmVudFBvcywgc3RhcnRQb3MpfXt9YDtcbiAgICBjdXJyZW50UG9zID0gZW5kUG9zO1xuICB9KTtcbiAgaW50ZXJwb2xhdGVkU3RyaW5nICs9IHZhbHVlLnNsaWNlKGN1cnJlbnRQb3MpO1xuXG4gIGNvbnN0IGVzY2FwZWRJbnRlcnBvbGF0ZWRTdHJpbmcgPSBpbnRlcnBvbGF0ZWRTdHJpbmdcbiAgICAucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKVxuICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAucmVwbGFjZSgvXFxyL2csICdcXFxccicpXG4gICAgLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxuICAgIC5yZXBsYWNlKC9cXHQvZywgJ1xcXFx0Jyk7XG5cbiAgY29uc3QgZGlyZWN0aXZlQXJncyA9IGVtYmVkZGVkRGlyZWN0aXZlcy5tYXAoKHsgZGVmaW5pdGlvbiB9KSA9PiBkZWZpbml0aW9uKS5qb2luKCcsICcpO1xuICBjb25zdCBoYXNSdW50aW1lRGlyZWN0aXZlID0gZW1iZWRkZWREaXJlY3RpdmVzLnNvbWUoKHsgbmFtZSB9KSA9PiBSVU5USU1FX0RJUkVDVElWRV9OQU1FUy5oYXMobmFtZSkpO1xuICBjb25zdCBmb3JtYXREaXJlY3RpdmVOYW1lID0gaGFzUnVudGltZURpcmVjdGl2ZSA/ICdDZkZvcm1hdCcgOiAnRm9ybWF0JztcbiAgcmV0dXJuIGAkJHtmb3JtYXREaXJlY3RpdmVOYW1lfSgnJHtlc2NhcGVkSW50ZXJwb2xhdGVkU3RyaW5nfScsICR7ZGlyZWN0aXZlQXJnc30pYDtcbn07XG5cbmNvbnN0IGdldEVtYmVkZGVkRGlyZWN0aXZlcyA9IChcbiAgdmFsdWU6IHN0cmluZ1xuKTogQXJyYXk8eyBkZWZpbml0aW9uOiBzdHJpbmc7IG5hbWU6IHN0cmluZzsgc3RhcnRQb3M6IG51bWJlcjsgZW5kUG9zOiBudW1iZXIgfT4gPT4ge1xuICBjb25zdCBkaXJlY3RpdmVzOiBBcnJheTx7IGRlZmluaXRpb246IHN0cmluZzsgbmFtZTogc3RyaW5nOyBzdGFydFBvczogbnVtYmVyOyBlbmRQb3M6IG51bWJlciB9PiA9IFtdO1xuXG4gIGNvbnN0IHRyeVBhcnNlRGlyZWN0aXZlQXQgPSAoXG4gICAgc3RyOiBzdHJpbmcsXG4gICAgc3RhcnRQb3M6IG51bWJlclxuICApOiB7IGRlZmluaXRpb246IHN0cmluZzsgbmFtZTogc3RyaW5nOyBlbmRQb3M6IG51bWJlciB9IHwgbnVsbCA9PiB7XG4gICAgaWYgKHN0cltzdGFydFBvc10gIT09ICckJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgbGV0IGlkeCA9IHN0YXJ0UG9zICsgMTtcbiAgICBjb25zdCBmaXJzdE5hbWVDaGFyID0gc3RyW2lkeF07XG4gICAgaWYgKCFmaXJzdE5hbWVDaGFyIHx8ICFmaXJzdE5hbWVDaGFyLm1hdGNoKC9bQS1aX10vaSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHdoaWxlIChpZHggPCBzdHIubGVuZ3RoICYmIHN0cltpZHhdLm1hdGNoKC9bXFx3JF0vKSkge1xuICAgICAgaWR4Kys7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZSA9IHN0ci5zbGljZShzdGFydFBvcyArIDEsIGlkeCk7XG5cbiAgICBpZiAoc3RyW2lkeF0gIT09ICcoJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgbGV0IGRlcHRoID0gMDtcbiAgICBsZXQgaW5TaW5nbGVRdW90ZSA9IGZhbHNlO1xuICAgIGxldCBpbkRvdWJsZVF1b3RlID0gZmFsc2U7XG4gICAgbGV0IGNsb3NpbmdQYXJlblBvcyA9IC0xO1xuXG4gICAgZm9yIChsZXQgaSA9IGlkeDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgY2hhciA9IHN0cltpXTtcbiAgICAgIGNvbnN0IHByZXZDaGFyID0gaSA+IDAgPyBzdHJbaSAtIDFdIDogJyc7XG5cbiAgICAgIGlmIChjaGFyID09PSBcIidcIiAmJiBwcmV2Q2hhciAhPT0gJ1xcXFwnICYmICFpbkRvdWJsZVF1b3RlKSB7XG4gICAgICAgIGluU2luZ2xlUXVvdGUgPSAhaW5TaW5nbGVRdW90ZTtcbiAgICAgIH0gZWxzZSBpZiAoY2hhciA9PT0gJ1wiJyAmJiBwcmV2Q2hhciAhPT0gJ1xcXFwnICYmICFpblNpbmdsZVF1b3RlKSB7XG4gICAgICAgIGluRG91YmxlUXVvdGUgPSAhaW5Eb3VibGVRdW90ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFpblNpbmdsZVF1b3RlICYmICFpbkRvdWJsZVF1b3RlKSB7XG4gICAgICAgIGlmIChjaGFyID09PSAnKCcpIHtcbiAgICAgICAgICBkZXB0aCsrO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYXIgPT09ICcpJykge1xuICAgICAgICAgIGRlcHRoLS07XG4gICAgICAgICAgaWYgKGRlcHRoID09PSAwKSB7XG4gICAgICAgICAgICBjbG9zaW5nUGFyZW5Qb3MgPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNsb3NpbmdQYXJlblBvcyA9PT0gLTEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGxldCBlbmRQb3MgPSBjbG9zaW5nUGFyZW5Qb3MgKyAxO1xuICAgIGlmIChzdHJbZW5kUG9zXSA9PT0gJy4nKSB7XG4gICAgICBlbmRQb3MrKztcbiAgICAgIHdoaWxlIChlbmRQb3MgPCBzdHIubGVuZ3RoICYmIHN0cltlbmRQb3NdLm1hdGNoKC9bXFx3JFxcLl0vKSkge1xuICAgICAgICBlbmRQb3MrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZGVmaW5pdGlvbjogc3RyLnNsaWNlKHN0YXJ0UG9zLCBlbmRQb3MpLFxuICAgICAgbmFtZSxcbiAgICAgIGVuZFBvc1xuICAgIH07XG4gIH07XG5cbiAgbGV0IGlkeCA9IDA7XG4gIHdoaWxlIChpZHggPCB2YWx1ZS5sZW5ndGgpIHtcbiAgICBpZiAodmFsdWVbaWR4XSA9PT0gJyQnKSB7XG4gICAgICBjb25zdCBwYXJzZWQgPSB0cnlQYXJzZURpcmVjdGl2ZUF0KHZhbHVlLCBpZHgpO1xuICAgICAgaWYgKHBhcnNlZCkge1xuICAgICAgICBkaXJlY3RpdmVzLnB1c2goeyBkZWZpbml0aW9uOiBwYXJzZWQuZGVmaW5pdGlvbiwgbmFtZTogcGFyc2VkLm5hbWUsIHN0YXJ0UG9zOiBpZHgsIGVuZFBvczogcGFyc2VkLmVuZFBvcyB9KTtcbiAgICAgICAgaWR4ID0gcGFyc2VkLmVuZFBvcztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuICAgIGlkeCsrO1xuICB9XG5cbiAgcmV0dXJuIGRpcmVjdGl2ZXM7XG59O1xuIiwKICAgICIvKipcbiAqIFJldHVybnMgYSByZWZlcmVuY2UgdG8gYSByZXNvdXJjZSBwYXJhbWV0ZXIuXG4gKiBAcGFyYW0gcmVzb3VyY2VOYW1lIC0gVGhlIG5hbWUgb2YgdGhlIHJlc291cmNlIGFzIHNwZWNpZmllZCBpbiB0aGUgU3RhY2t0YXBlIGNvbmZpZy5cbiAqIEBwYXJhbSBwcm9wZXJ0eSAtIFRoZSBwcm9wZXJ0eSBvZiB0aGUgcmVzb3VyY2UuIFRoZSBsaXN0IG9mIHByb3BlcnRpZXMgaXMgYXZhaWxhYmxlIGluIHRoZSBTdGFja3RhcGUgZG9jcyBmb3IgZXZlcnkgZ2l2ZW4gcmVzb3VyY2UgdHlwZS5cbiAqL1xuZXhwb3J0IGNvbnN0ICRSZXNvdXJjZVBhcmFtID0gKHJlc291cmNlTmFtZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nKSA9PiB7XG4gIHJldHVybiBgJFJlc291cmNlUGFyYW0oJyR7cmVzb3VyY2VOYW1lfScsJyR7cHJvcGVydHl9JylgO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIGEgQ2xvdWRGb3JtYXRpb24gcmVzb3VyY2UgcGFyYW1ldGVyLlxuICogQHBhcmFtIGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VMb2dpY2FsSWQgLSBUaGUgbG9naWNhbCBuYW1lIG9mIHRoZSBDbG91ZGZvcm1hdGlvbiByZXNvdXJjZS5cbiAqIElmIHlvdSBhcmUgcmVmZXJlbmNpbmcgYSByZXNvdXJjZSBkZWZpbmVkIGluIHRoZSBjbG91ZGZvcm1hdGlvblJlc291cmNlcyBzZWN0aW9uLCB1c2UgaXRzIG5hbWUuXG4gKiBUbyByZWZlcmVuY2UgYSBjaGlsZCByZXNvdXJjZSBvZiBhIFN0YWNrdGFwZSByZXNvdXJjZSwgeW91IGNhbiBnZXQgYSBsaXN0IG9mIGNoaWxkIHJlc291cmNlcyB3aXRoIHRoZSBgc3RhY2t0YXBlIHN0YWNrLWluZm9gIGNvbW1hbmRcbiAqIEBwYXJhbSBwcm9wZXJ0eSAtIFRoZSBwYXJhbWV0ZXIgb2YgdGhlIENsb3VkZm9ybWF0aW9uIHJlc291cmNlIHRvIHJlZmVyZW5jZS5cbiAqIEZvciBhIGxpc3Qgb2YgYWxsIHJlZmVyZW5jZWFibGUgcGFyYW1ldGVycywgcmVmZXIgdG8gdGhlIFtSZWZlcmVuY2luZyBwYXJhbWV0ZXJzXShodHRwczovL2RvY3Muc3RhY2t0YXBlLmNvbS9jb25maWd1cmF0aW9uL3JlZmVyZW5jaW5nLXBhcmFtZXRlcnMjcGFyYW1ldGVycy1vZi1jbG91ZGZvcm1hdGlvbi1yZXNvdXJjZXMpIHNlY3Rpb24gaW4gdGhlIFN0YWNrdGFwZSBkb2NzLlxuICovXG5leHBvcnQgY29uc3QgJENmUmVzb3VyY2VQYXJhbSA9IChjbG91ZGZvcm1hdGlvblJlc291cmNlTG9naWNhbElkOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcpID0+IHtcbiAgcmV0dXJuIGAkQ2ZSZXNvdXJjZVBhcmFtKCcke2Nsb3VkZm9ybWF0aW9uUmVzb3VyY2VMb2dpY2FsSWR9JywnJHtwcm9wZXJ0eX0nKWA7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSByZWZlcmVuY2UgdG8gYSBzZWNyZXQuXG4gKiBAcGFyYW0gc2VjcmV0TmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBzZWNyZXQuIE11c3QgYmUgYSB2YWxpZCBzZWNyZXQgbmFtZSBpbiB0aGUgQVdTIFNlY3JldHMgTWFuYWdlciBpbiB0aGUgcmVnaW9uIHlvdSdyZSBkZXBsb3lpbmcgdG8uXG4gKiBJZiB0aGUgc2VjcmV0IGlzIGluIEpTT04gZm9ybWF0LCB5b3UgY2FuIGV4dHJhY3QgbmVzdGVkIHByb3BlcnRpZXMgdXNpbmcgZG90IG5vdGF0aW9uLlxuICogRXhhbXBsZTogYCRTZWNyZXQoJ215LXNlY3JldC5hcGkta2V5JylgIHdpbGwgcmV0dXJuIHRoZSB2YWx1ZSBvZiB0aGUgYGFwaS1rZXlgIHByb3BlcnR5IGluIHRoZSBgbXktc2VjcmV0YCBzZWNyZXQuXG4gKi9cbmV4cG9ydCBjb25zdCAkU2VjcmV0ID0gKHNlY3JldE5hbWU6IHN0cmluZykgPT4ge1xuICByZXR1cm4gYCRTZWNyZXQoJyR7c2VjcmV0TmFtZX0nKWA7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSByZWZlcmVuY2UgdG8gYW4gU1NNIFBhcmFtZXRlciBTdG9yZSBwYXJhbWV0ZXIuXG4gKiBAcGFyYW0gcGFyYW1OYW1lIC0gVGhlIG5hbWUgKG9yIHBhdGgpIG9mIHRoZSBTU00gcGFyYW1ldGVyLiBNdXN0IGV4aXN0IGluIHRoZSBBV1MgU3lzdGVtcyBNYW5hZ2VyIFBhcmFtZXRlciBTdG9yZSBpbiB0aGUgcmVnaW9uIHlvdSdyZSBkZXBsb3lpbmcgdG8uXG4gKiBTdXBwb3J0cyBib3RoIGBTdHJpbmdgIGFuZCBgU2VjdXJlU3RyaW5nYCBwYXJhbWV0ZXIgdHlwZXMgKGF1dG8tZGV0ZWN0ZWQpLlxuICogRXhhbXBsZTogYCRTc21QYXJhbSgnbXktYXBpLWtleScpYCBvciBgJFNzbVBhcmFtKCcvcHJvZC9kYXRhYmFzZS9ob3N0JylgXG4gKi9cbmV4cG9ydCBjb25zdCAkU3NtUGFyYW0gPSAocGFyYW1OYW1lOiBzdHJpbmcpID0+IHtcbiAgcmV0dXJuIGAkU3NtUGFyYW0oJyR7cGFyYW1OYW1lfScpYDtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhbiBpbnRlcnBvbGF0ZWQgc3RyaW5nLiBVbmxpa2UgdGhlICRGb3JtYXQoKSBkaXJlY3RpdmUsIHRoZSAkQ2ZGb3JtYXQoKSBkaXJlY3RpdmUgY2FuIGNvbnRhaW4gcnVudGltZS1yZXNvbHZlZCBkaXJlY3RpdmVzIGFzIGFyZ3VtZW50cy5cbiAqIEBwYXJhbSBpbnRlcnBvbGF0ZWRTdHJpbmcgLSBPY2N1cnJlbmNlcyBvZiB7fSBhcmUgcmVwbGFjZWQgYnkgdGhlIHN1YnNlcXVlbnQgYXJndW1lbnRzLlxuICogQHBhcmFtIHZhbHVlcyAtIFRoZSBudW1iZXIgb2YgdmFsdWVzIG11c3QgYmUgZXF1YWwgdG8gdGhlIG51bWJlciBvZiB7fSBwbGFjZWhvbGRlcnMgaW4gdGhlIGZpcnN0IGFyZ3VtZW50LlxuICogRXhhbXBsZTpcbiAqIGAkQ2ZGb3JtYXQoJ3t9LXt9JywgJ2ZvbycsICdiYXInKWAgcmVzdWx0cyBpbiBgZm9vLWJhcmAuXG4gKiAkQ2ZGb3JtYXQoJ3t9LW15ZG9tYWluLmNvbScsICdmb28nKSByZXN1bHRzIGluIGZvby1teWRvbWFpbi5jb20uXG4gKiBgJENmRm9ybWF0KCd7fS5teWRvbWFpbi5jb20nLCAkU3RhZ2UoKSlgIHJlc3VsdHMgaW4gYHN0YWdpbmcubXlkb21haW4uY29tYCBpZiB0aGUgc3RhZ2UgaXMgc3RhZ2luZy5cbiAqL1xuZXhwb3J0IGNvbnN0ICRDZkZvcm1hdCA9IChpbnRlcnBvbGF0ZWRTdHJpbmc6IHN0cmluZywgLi4udmFsdWVzOiBhbnlbXSkgPT4ge1xuICByZXR1cm4gYCRDZkZvcm1hdCgnJHtpbnRlcnBvbGF0ZWRTdHJpbmd9JywgJyR7dmFsdWVzLmpvaW4oJywnKX0nKWA7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIG91dHB1dCBvZiBhbm90aGVyIHN0YWNrLCBhbGxvd2luZyB5b3UgdG8gcmVmZXJlbmNlIHJlc291cmNlcyBkZXBsb3llZCBpbiBhbm90aGVyIHN0YWNrLiBUaGUgcmVmZXJlbmNlZCBzdGFjayBtdXN0IGFscmVhZHkgYmUgZGVwbG95ZWQuIElmIHlvdSB0cnkgdG8gZGVsZXRlIGEgc3RhY2sgdGhhdCBpcyByZWZlcmVuY2VkIGJ5IGFub3RoZXIgc3RhY2ssIHlvdSB3aWxsIGdldCBhbiBlcnJvci5cbiAqIFRvIGdldCB0aGUgb3V0cHV0IGxvY2FsbHkgKGkuZS4sIGRvd25sb2FkIHRoZSB2YWx1ZSBhbmQgcGFzcyBpdCB0byB0aGUgY29uZmlndXJhdGlvbiksIHVzZSB0aGUgJFN0YWNrT3V0cHV0KCkgZGlyZWN0aXZlLlxuICogQHBhcmFtIHN0YWNrTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBzdGFjay5cbiAqIEBwYXJhbSBvdXRwdXROYW1lIC0gVGhlIG5hbWUgb2YgdGhlIG91dHB1dC5cbiAqL1xuZXhwb3J0IGNvbnN0ICRDZlN0YWNrT3V0cHV0ID0gKHN0YWNrTmFtZTogc3RyaW5nLCBvdXRwdXROYW1lOiBzdHJpbmcpID0+IHtcbiAgcmV0dXJuIGAkQ2ZTdGFja091dHB1dCgnJHtzdGFja05hbWV9JywnJHtvdXRwdXROYW1lfScpYDtcbn07XG5cbi8qKlxuICogUmV0dXJucyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY3VycmVudCBHaXQgcmVwb3NpdG9yeS5cbiAqXG4gKiAkR2l0SW5mbygpLnNoYTEgLSBTSEEtMSBvZiB0aGUgbGF0ZXN0IGNvbW1pdFxuICpcbiAqICRHaXRJbmZvKCkuY29tbWl0IC0gVGhlIGxhdGVzdCBjb21taXQgSURcbiAqXG4gKiAkR2l0SW5mbygpLmJyYW5jaCAtIFRoZSBuYW1lIG9mIHRoZSBjdXJyZW50IGJyYW5jaFxuICpcbiAqICRHaXRJbmZvKCkubWVzc2FnZSAtIFRoZSBtZXNzYWdlIG9mIHRoZSBsYXN0IGNvbW1pdFxuICpcbiAqICRHaXRJbmZvKCkudXNlciAtIEdpdCB1c2VyJ3MgbmFtZVxuICpcbiAqICRHaXRJbmZvKCkuZW1haWwgLSBHaXQgdXNlcidzIGVtYWlsXG4gKlxuICogJEdpdEluZm8oKS5yZXBvc2l0b3J5IC0gVGhlIG5hbWUgb2YgdGhlIGdpdCByZXBvc2l0b3J5XG4gKlxuICogJEdpdEluZm8oKS50YWdzIC0gVGhlIHRhZ3MgcG9pbnRpbmcgdG8gdGhlIGN1cnJlbnQgY29tbWl0XG4gKlxuICogJEdpdEluZm8oKS5kZXNjcmliZSAtIFRoZSBtb3N0IHJlY2VudCB0YWcgdGhhdCBpcyByZWFjaGFibGUgZnJvbSBhIGNvbW1pdFxuICovXG5leHBvcnQgY29uc3QgJEdpdEluZm8gPSAoKSA9PiB7XG4gIHJldHVybiAnJEdpdEluZm8oKSc7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGN1cnJlbnQgQVdTIHJlZ2lvbiB3aGVyZSB0aGUgc3RhY2sgaXMgYmVpbmcgZGVwbG95ZWQuXG4gKiBFeGFtcGxlOiBgdXMtZWFzdC0xYFxuICovXG5leHBvcnQgY29uc3QgJFJlZ2lvbiA9ICgpID0+IHtcbiAgcmV0dXJuICckUmVnaW9uKCknO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjdXJyZW50IHN0YWdlIG5hbWUuXG4gKiBFeGFtcGxlOiBgcHJvZHVjdGlvbmAsIGBzdGFnaW5nYCwgYGRldmBcbiAqL1xuZXhwb3J0IGNvbnN0ICRTdGFnZSA9ICgpID0+IHtcbiAgcmV0dXJuICckU3RhZ2UoKSc7XG59O1xuIiwKICAgICIvKipcbiAqIEFXUyBTRVMgKFNpbXBsZSBFbWFpbCBTZXJ2aWNlKSByZWZlcmVuY2UgZm9yIGNvbm5lY3RUb1xuICogR3JhbnRzIGZ1bGwgcGVybWlzc2lvbnMgZm9yIEFXUyBTRVMgKHNlczoqKVxuICovXG5leHBvcnQgY29uc3QgQVdTX1NFUyA9ICdhd3M6c2VzJyBhcyBjb25zdDtcblxuLyoqXG4gKiBUeXBlIHRoYXQgcmVwcmVzZW50cyBhbnkgQVdTIHNlcnZpY2UgY29uc3RhbnRcbiAqL1xuZXhwb3J0IHR5cGUgR2xvYmFsQXdzU2VydmljZUNvbnN0YW50ID0gdHlwZW9mIEFXU19TRVM7XG4iLAogICAgIi8qKlxuICogVGhpcyBmaWxlIGRlZmluZXMgdHlwZS1wcm9wZXJ0aWVzIHNoYXBlZCBkZWZpbml0aW9ucyAoZS5nLiBTdGFja3RhcGUgcmVzb3VyY2VzLCBwYWNrYWdpbmcgdHlwZXMgZXRjLilcbiAqIHRoYXQgY2FuIGJlIGNvbnZlcnRlZCB0byBhIFR5cGVzY3JpcHQgY2xhc3MuIFRoZXNlIGNsYXNzZXMgYXJlIHRoZW4gZXhwb3J0ZWQgZnJvbSBzdGFja3RhcGUvY2xhc3Nlc1xuICpcbiAqIEBleGFtcGxlIGltcG9ydCB7IFN0YWNrdGFwZUxhbWJkYUJ1aWxkcGFja1BhY2thZ2luZyB9IGZyb20gJ3N0YWNrdGFwZS9jbGFzc2VzJztcbiAqL1xuXG5leHBvcnQgdHlwZSBSZXNvdXJjZUNsYXNzTmFtZSA9IE9taXQ8S2ViYWJUb1Bhc2NhbENhc2U8U3RwUmVzb3VyY2VUeXBlPiwgJ0Z1bmN0aW9uJz4gfCAnTGFtYmRhRnVuY3Rpb24nO1xuXG5leHBvcnQgdHlwZSBSZXNvdXJjZURlZmluaXRpb24gPSB7XG4gIC8qKiBDbGFzcyBuYW1lIGZvciB0aGUgcmVzb3VyY2UgKGUuZy4sICdMYW1iZGFGdW5jdGlvbicpICovXG4gIGNsYXNzTmFtZTogUmVzb3VyY2VDbGFzc05hbWU7XG4gIC8qKiBSZXNvdXJjZSB0eXBlIGlkZW50aWZpZXIgdXNlZCBpbiBjb25maWcgKGUuZy4sICdmdW5jdGlvbicpICovXG4gIHJlc291cmNlVHlwZTogc3RyaW5nO1xuICAvKiogUHJvcHMgdHlwZSBuYW1lIChlLmcuLCAnTGFtYmRhRnVuY3Rpb25Qcm9wcycpICovXG4gIHByb3BzVHlwZTogc3RyaW5nO1xuICAvKiogSW50ZXJmYWNlIG5hbWUgaW4gdGhlIHNvdXJjZSAuZC50cyBmaWxlIChlLmcuLCAnTGFtYmRhRnVuY3Rpb24nKSAqL1xuICBpbnRlcmZhY2VOYW1lOiBzdHJpbmc7XG4gIC8qKiBTb3VyY2UgLmQudHMgZmlsZSBuYW1lIChlLmcuLCAnZnVuY3Rpb25zLmQudHMnKSAqL1xuICBzb3VyY2VGaWxlOiBzdHJpbmc7XG4gIC8qKiBSZXNvdXJjZXMgYW5kIEFXUyBzZXJ2aWNlcyB0aGlzIHJlc291cmNlIGNhbiBjb25uZWN0IHRvLiBHbG9iYWxBd3NTZXJ2aWNlQ29uc3RhbnQgaXMgZm9yIGdsb2JhbCBzZXJ2aWNlcywgZS5nLiBhd3M6c2VzICAqL1xuICBjYW5Db25uZWN0VG8/OiBzdHJpbmdbXTtcbiAgLyoqIFdoZXRoZXIgdGhpcyByZXNvdXJjZSBzdXBwb3J0cyBvdmVycmlkZXMgKGRlZmF1bHQ6IHRydWUpICovXG4gIHN1cHBvcnRzT3ZlcnJpZGVzPzogYm9vbGVhbjtcbiAgLyoqIFdoZXRoZXIgdGhpcyByZXNvdXJjZSBoYXMgYXVnbWVudGVkIGNvbm5lY3RUby9lbnZpcm9ubWVudCBwcm9wcyAoZGVmYXVsdDogZmFsc2UpICovXG4gIGhhc0F1Z21lbnRlZFByb3BzPzogYm9vbGVhbjtcbn07XG5cbi8qKlxuICogQ29tcGxldGUgbGlzdCBvZiBhbGwgU3RhY2t0YXBlIHJlc291cmNlcy5cbiAqIFRoaXMgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggLSBhbGwgY29kZSBnZW5lcmF0aW9uIGRlcml2ZXMgZnJvbSB0aGlzLlxuICovXG5leHBvcnQgY29uc3QgUkVTT1VSQ0VTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVM6IFJlc291cmNlRGVmaW5pdGlvbltdID0gW1xuICB7XG4gICAgY2xhc3NOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICByZXNvdXJjZVR5cGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlJyxcbiAgICBwcm9wc1R5cGU6ICdSZWxhdGlvbmFsRGF0YWJhc2VQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1dlYlNlcnZpY2UnLFxuICAgIHJlc291cmNlVHlwZTogJ3dlYi1zZXJ2aWNlJyxcbiAgICBwcm9wc1R5cGU6ICdXZWJTZXJ2aWNlUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdXZWJTZXJ2aWNlJyxcbiAgICBzb3VyY2VGaWxlOiAnd2ViLXNlcnZpY2VzLmQudHMnLFxuICAgIGhhc0F1Z21lbnRlZFByb3BzOiB0cnVlLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbScsXG4gICAgICAnUHJpdmF0ZVNlcnZpY2UnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUHJpdmF0ZVNlcnZpY2UnLFxuICAgIHJlc291cmNlVHlwZTogJ3ByaXZhdGUtc2VydmljZScsXG4gICAgcHJvcHNUeXBlOiAnUHJpdmF0ZVNlcnZpY2VQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1ByaXZhdGVTZXJ2aWNlJyxcbiAgICBzb3VyY2VGaWxlOiAncHJpdmF0ZS1zZXJ2aWNlcy5kLnRzJyxcbiAgICBoYXNBdWdtZW50ZWRQcm9wczogdHJ1ZSxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnV29ya2VyU2VydmljZScsXG4gICAgcmVzb3VyY2VUeXBlOiAnd29ya2VyLXNlcnZpY2UnLFxuICAgIHByb3BzVHlwZTogJ1dvcmtlclNlcnZpY2VQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1dvcmtlclNlcnZpY2UnLFxuICAgIHNvdXJjZUZpbGU6ICd3b3JrZXItc2VydmljZXMuZC50cycsXG4gICAgaGFzQXVnbWVudGVkUHJvcHM6IHRydWUsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJ1xuICAgIF1cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ011bHRpQ29udGFpbmVyV29ya2xvYWQnLFxuICAgIHJlc291cmNlVHlwZTogJ211bHRpLWNvbnRhaW5lci13b3JrbG9hZCcsXG4gICAgcHJvcHNUeXBlOiAnQ29udGFpbmVyV29ya2xvYWRQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ011bHRpQ29udGFpbmVyV29ya2xvYWQnLFxuICAgIHNvdXJjZUZpbGU6ICdtdWx0aS1jb250YWluZXItd29ya2xvYWRzLmQudHMnLFxuICAgIGhhc0F1Z21lbnRlZFByb3BzOiB0cnVlLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbScsXG4gICAgICAnTGFtYmRhRnVuY3Rpb24nLFxuICAgICAgJ0JhdGNoSm9iJyxcbiAgICAgICdVc2VyQXV0aFBvb2wnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTGFtYmRhRnVuY3Rpb24nLFxuICAgIHJlc291cmNlVHlwZTogJ2Z1bmN0aW9uJyxcbiAgICBwcm9wc1R5cGU6ICdMYW1iZGFGdW5jdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTGFtYmRhRnVuY3Rpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdmdW5jdGlvbnMuZC50cycsXG4gICAgaGFzQXVnbWVudGVkUHJvcHM6IHRydWUsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJyxcbiAgICAgICdQcml2YXRlU2VydmljZScsXG4gICAgICAnV2ViU2VydmljZScsXG4gICAgICAnTGFtYmRhRnVuY3Rpb24nLFxuICAgICAgJ0JhdGNoSm9iJyxcbiAgICAgICdVc2VyQXV0aFBvb2wnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQmF0Y2hKb2InLFxuICAgIHJlc291cmNlVHlwZTogJ2JhdGNoLWpvYicsXG4gICAgcHJvcHNUeXBlOiAnQmF0Y2hKb2JQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0JhdGNoSm9iJyxcbiAgICBzb3VyY2VGaWxlOiAnYmF0Y2gtam9icy5kLnRzJyxcbiAgICBoYXNBdWdtZW50ZWRQcm9wczogdHJ1ZSxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQnVja2V0JyxcbiAgICByZXNvdXJjZVR5cGU6ICdidWNrZXQnLFxuICAgIHByb3BzVHlwZTogJ0J1Y2tldFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQnVja2V0JyxcbiAgICBzb3VyY2VGaWxlOiAnYnVja2V0cy5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdIb3N0aW5nQnVja2V0JyxcbiAgICByZXNvdXJjZVR5cGU6ICdob3N0aW5nLWJ1Y2tldCcsXG4gICAgcHJvcHNUeXBlOiAnSG9zdGluZ0J1Y2tldFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnSG9zdGluZ0J1Y2tldCcsXG4gICAgc291cmNlRmlsZTogJ2hvc3RpbmctYnVja2V0cy5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdEeW5hbW9EYlRhYmxlJyxcbiAgICByZXNvdXJjZVR5cGU6ICdkeW5hbW8tZGItdGFibGUnLFxuICAgIHByb3BzVHlwZTogJ0R5bmFtb0RiVGFibGVQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0R5bmFtb0RiVGFibGUnLFxuICAgIHNvdXJjZUZpbGU6ICdkeW5hbW8tZGItdGFibGVzLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0V2ZW50QnVzJyxcbiAgICByZXNvdXJjZVR5cGU6ICdldmVudC1idXMnLFxuICAgIHByb3BzVHlwZTogJ0V2ZW50QnVzUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdFdmVudEJ1cycsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50LWJ1c2VzLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0h0dHBBcGlHYXRld2F5JyxcbiAgICByZXNvdXJjZVR5cGU6ICdodHRwLWFwaS1nYXRld2F5JyxcbiAgICBwcm9wc1R5cGU6ICdIdHRwQXBpR2F0ZXdheVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnSHR0cEFwaUdhdGV3YXknLFxuICAgIHNvdXJjZUZpbGU6ICdodHRwLWFwaS1nYXRld2F5cy5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlcicsXG4gICAgcmVzb3VyY2VUeXBlOiAnYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlcicsXG4gICAgcHJvcHNUeXBlOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlcnMuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTmV0d29ya0xvYWRCYWxhbmNlcicsXG4gICAgcmVzb3VyY2VUeXBlOiAnbmV0d29yay1sb2FkLWJhbGFuY2VyJyxcbiAgICBwcm9wc1R5cGU6ICdOZXR3b3JrTG9hZEJhbGFuY2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdOZXR3b3JrTG9hZEJhbGFuY2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnbmV0d29yay1sb2FkLWJhbGFuY2VyLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1JlZGlzQ2x1c3RlcicsXG4gICAgcmVzb3VyY2VUeXBlOiAncmVkaXMtY2x1c3RlcicsXG4gICAgcHJvcHNUeXBlOiAnUmVkaXNDbHVzdGVyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZWRpc0NsdXN0ZXInLFxuICAgIHNvdXJjZUZpbGU6ICdyZWRpcy1jbHVzdGVyLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgIHJlc291cmNlVHlwZTogJ21vbmdvLWRiLWF0bGFzLWNsdXN0ZXInLFxuICAgIHByb3BzVHlwZTogJ01vbmdvRGJBdGxhc0NsdXN0ZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgIHNvdXJjZUZpbGU6ICdtb25nby1kYi1hdGxhcy1jbHVzdGVycy5kLnRzJyxcbiAgICBzdXBwb3J0c092ZXJyaWRlczogZmFsc2UsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnU3RhdGVNYWNoaW5lJyxcbiAgICByZXNvdXJjZVR5cGU6ICdzdGF0ZS1tYWNoaW5lJyxcbiAgICBwcm9wc1R5cGU6ICdTdGF0ZU1hY2hpbmVQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1N0YXRlTWFjaGluZScsXG4gICAgc291cmNlRmlsZTogJ3N0YXRlLW1hY2hpbmVzLmQudHMnLFxuICAgIGhhc0F1Z21lbnRlZFByb3BzOiB0cnVlLFxuICAgIGNhbkNvbm5lY3RUbzogWydGdW5jdGlvbicsICdCYXRjaEpvYiddXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdVc2VyQXV0aFBvb2wnLFxuICAgIHJlc291cmNlVHlwZTogJ3VzZXItYXV0aC1wb29sJyxcbiAgICBwcm9wc1R5cGU6ICdVc2VyQXV0aFBvb2xQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1VzZXJBdXRoUG9vbCcsXG4gICAgc291cmNlRmlsZTogJ3VzZXItcG9vbHMuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnVXBzdGFzaFJlZGlzJyxcbiAgICByZXNvdXJjZVR5cGU6ICd1cHN0YXNoLXJlZGlzJyxcbiAgICBwcm9wc1R5cGU6ICdVcHN0YXNoUmVkaXNQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Vwc3Rhc2hSZWRpcycsXG4gICAgc291cmNlRmlsZTogJ3Vwc3Rhc2gtcmVkaXMuZC50cycsXG4gICAgc3VwcG9ydHNPdmVycmlkZXM6IGZhbHNlLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Nxc1F1ZXVlJyxcbiAgICByZXNvdXJjZVR5cGU6ICdzcXMtcXVldWUnLFxuICAgIHByb3BzVHlwZTogJ1Nxc1F1ZXVlUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTcXNRdWV1ZScsXG4gICAgc291cmNlRmlsZTogJ3Nxcy1xdWV1ZXMuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnU25zVG9waWMnLFxuICAgIHJlc291cmNlVHlwZTogJ3Nucy10b3BpYycsXG4gICAgcHJvcHNUeXBlOiAnU25zVG9waWNQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Nuc1RvcGljJyxcbiAgICBzb3VyY2VGaWxlOiAnc25zLXRvcGljLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0tpbmVzaXNTdHJlYW0nLFxuICAgIHJlc291cmNlVHlwZTogJ2tpbmVzaXMtc3RyZWFtJyxcbiAgICBwcm9wc1R5cGU6ICdLaW5lc2lzU3RyZWFtUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdLaW5lc2lzU3RyZWFtJyxcbiAgICBzb3VyY2VGaWxlOiAna2luZXNpcy1zdHJlYW1zLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1dlYkFwcEZpcmV3YWxsJyxcbiAgICByZXNvdXJjZVR5cGU6ICd3ZWItYXBwLWZpcmV3YWxsJyxcbiAgICBwcm9wc1R5cGU6ICdXZWJBcHBGaXJld2FsbFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnV2ViQXBwRmlyZXdhbGwnLFxuICAgIHNvdXJjZUZpbGU6ICd3ZWItYXBwLWZpcmV3YWxsLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ09wZW5TZWFyY2hEb21haW4nLFxuICAgIHJlc291cmNlVHlwZTogJ29wZW4tc2VhcmNoLWRvbWFpbicsXG4gICAgcHJvcHNUeXBlOiAnT3BlblNlYXJjaERvbWFpblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgc291cmNlRmlsZTogJ29wZW4tc2VhcmNoLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0Vmc0ZpbGVzeXN0ZW0nLFxuICAgIHJlc291cmNlVHlwZTogJ2Vmcy1maWxlc3lzdGVtJyxcbiAgICBwcm9wc1R5cGU6ICdFZnNGaWxlc3lzdGVtUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdFZnNGaWxlc3lzdGVtJyxcbiAgICBzb3VyY2VGaWxlOiAnZWZzLWZpbGVzeXN0ZW0uZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTmV4dGpzV2ViJyxcbiAgICByZXNvdXJjZVR5cGU6ICduZXh0anMtd2ViJyxcbiAgICBwcm9wc1R5cGU6ICdOZXh0anNXZWJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ05leHRqc1dlYicsXG4gICAgc291cmNlRmlsZTogJ25leHRqcy13ZWIuZC50cycsXG4gICAgaGFzQXVnbWVudGVkUHJvcHM6IHRydWUsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJyxcbiAgICAgICdQcml2YXRlU2VydmljZScsXG4gICAgICAnV2ViU2VydmljZScsXG4gICAgICAnTGFtYmRhRnVuY3Rpb24nLFxuICAgICAgJ0JhdGNoSm9iJyxcbiAgICAgICdVc2VyQXV0aFBvb2wnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXN0cm9XZWInLFxuICAgIHJlc291cmNlVHlwZTogJ2FzdHJvLXdlYicsXG4gICAgcHJvcHNUeXBlOiAnQXN0cm9XZWJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0FzdHJvV2ViJyxcbiAgICBzb3VyY2VGaWxlOiAnYXN0cm8td2ViLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbScsXG4gICAgICAnUHJpdmF0ZVNlcnZpY2UnLFxuICAgICAgJ1dlYlNlcnZpY2UnLFxuICAgICAgJ0xhbWJkYUZ1bmN0aW9uJyxcbiAgICAgICdCYXRjaEpvYicsXG4gICAgICAnVXNlckF1dGhQb29sJ1xuICAgIF1cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ051eHRXZWInLFxuICAgIHJlc291cmNlVHlwZTogJ251eHQtd2ViJyxcbiAgICBwcm9wc1R5cGU6ICdOdXh0V2ViUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdOdXh0V2ViJyxcbiAgICBzb3VyY2VGaWxlOiAnbnV4dC13ZWIuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJyxcbiAgICAgICdQcml2YXRlU2VydmljZScsXG4gICAgICAnV2ViU2VydmljZScsXG4gICAgICAnTGFtYmRhRnVuY3Rpb24nLFxuICAgICAgJ0JhdGNoSm9iJyxcbiAgICAgICdVc2VyQXV0aFBvb2wnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnU3ZlbHRlS2l0V2ViJyxcbiAgICByZXNvdXJjZVR5cGU6ICdzdmVsdGVraXQtd2ViJyxcbiAgICBwcm9wc1R5cGU6ICdTdmVsdGVLaXRXZWJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1N2ZWx0ZUtpdFdlYicsXG4gICAgc291cmNlRmlsZTogJ3N2ZWx0ZWtpdC13ZWIuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJyxcbiAgICAgICdQcml2YXRlU2VydmljZScsXG4gICAgICAnV2ViU2VydmljZScsXG4gICAgICAnTGFtYmRhRnVuY3Rpb24nLFxuICAgICAgJ0JhdGNoSm9iJyxcbiAgICAgICdVc2VyQXV0aFBvb2wnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnU29saWRTdGFydFdlYicsXG4gICAgcmVzb3VyY2VUeXBlOiAnc29saWRzdGFydC13ZWInLFxuICAgIHByb3BzVHlwZTogJ1NvbGlkU3RhcnRXZWJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1NvbGlkU3RhcnRXZWInLFxuICAgIHNvdXJjZUZpbGU6ICdzb2xpZHN0YXJ0LXdlYi5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nLFxuICAgICAgJ1ByaXZhdGVTZXJ2aWNlJyxcbiAgICAgICdXZWJTZXJ2aWNlJyxcbiAgICAgICdMYW1iZGFGdW5jdGlvbicsXG4gICAgICAnQmF0Y2hKb2InLFxuICAgICAgJ1VzZXJBdXRoUG9vbCdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdUYW5TdGFja1dlYicsXG4gICAgcmVzb3VyY2VUeXBlOiAndGFuc3RhY2std2ViJyxcbiAgICBwcm9wc1R5cGU6ICdUYW5TdGFja1dlYlByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnVGFuU3RhY2tXZWInLFxuICAgIHNvdXJjZUZpbGU6ICd0YW5zdGFjay13ZWIuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJyxcbiAgICAgICdQcml2YXRlU2VydmljZScsXG4gICAgICAnV2ViU2VydmljZScsXG4gICAgICAnTGFtYmRhRnVuY3Rpb24nLFxuICAgICAgJ0JhdGNoSm9iJyxcbiAgICAgICdVc2VyQXV0aFBvb2wnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmVtaXhXZWInLFxuICAgIHJlc291cmNlVHlwZTogJ3JlbWl4LXdlYicsXG4gICAgcHJvcHNUeXBlOiAnUmVtaXhXZWJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1JlbWl4V2ViJyxcbiAgICBzb3VyY2VGaWxlOiAncmVtaXgtd2ViLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbScsXG4gICAgICAnUHJpdmF0ZVNlcnZpY2UnLFxuICAgICAgJ1dlYlNlcnZpY2UnLFxuICAgICAgJ0xhbWJkYUZ1bmN0aW9uJyxcbiAgICAgICdCYXRjaEpvYicsXG4gICAgICAnVXNlckF1dGhQb29sJ1xuICAgIF1cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0Jhc3Rpb24nLFxuICAgIHJlc291cmNlVHlwZTogJ2Jhc3Rpb24nLFxuICAgIHByb3BzVHlwZTogJ0Jhc3Rpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0Jhc3Rpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdiYXN0aW9uLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfVxuXTtcblxuLyoqXG4gKiBEZWZpbmVzIGFsbCB0eXBlICsgcHJvcGVydGllcyBzaGFwZWQgZGVmaW5pdGlvbnMgdGhhdCBjYW4gYmUgY29udmVydGVkIHRvIGEgVHlwZXNjcmlwdCBjbGFzc1xuICovXG5leHBvcnQgdHlwZSBUeXBlUHJvcGVydGllc0RlZmluaXRpb24gPSB7XG4gIGNsYXNzTmFtZTogc3RyaW5nO1xuICB0eXBlVmFsdWU6IHN0cmluZztcbiAgcHJvcHNUeXBlOiBzdHJpbmc7XG4gIGludGVyZmFjZU5hbWU6IHN0cmluZztcbiAgc291cmNlRmlsZTogc3RyaW5nO1xuICAvKiogSWYgdHJ1ZSwgdGhpcyB0eXBlIGhhcyBubyBwcm9wZXJ0aWVzIGZpZWxkIC0ganVzdCBhIHR5cGUgZGlzY3JpbWluYXRvciAqL1xuICB0eXBlT25seT86IGJvb2xlYW47XG4gIC8qKiBDdXN0b20gSlNEb2MgZGVzY3JpcHRpb24gZm9yIHRoZSBjbGFzcyBjb25zdHJ1Y3RvciAqL1xuICBqc2RvYz86IHN0cmluZztcbn07XG5cbmV4cG9ydCBjb25zdCBNSVNDX1RZUEVTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVM6IFR5cGVQcm9wZXJ0aWVzRGVmaW5pdGlvbltdID0gW1xuICAvLyBEYXRhYmFzZSBFbmdpbmVzXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVQb3N0Z3JlcycsXG4gICAgdHlwZVZhbHVlOiAncG9zdGdyZXMnLFxuICAgIHByb3BzVHlwZTogJ1Jkc0VuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZHNFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmRzRW5naW5lTWFyaWFkYicsXG4gICAgdHlwZVZhbHVlOiAnbWFyaWFkYicsXG4gICAgcHJvcHNUeXBlOiAnUmRzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Jkc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVNeXNxbCcsXG4gICAgdHlwZVZhbHVlOiAnbXlzcWwnLFxuICAgIHByb3BzVHlwZTogJ1Jkc0VuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZHNFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmRzRW5naW5lT3JhY2xlRUUnLFxuICAgIHR5cGVWYWx1ZTogJ29yYWNsZS1lZScsXG4gICAgcHJvcHNUeXBlOiAnUmRzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Jkc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVPcmFjbGVTRTInLFxuICAgIHR5cGVWYWx1ZTogJ29yYWNsZS1zZTInLFxuICAgIHByb3BzVHlwZTogJ1Jkc0VuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZHNFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmRzRW5naW5lU3FsU2VydmVyRUUnLFxuICAgIHR5cGVWYWx1ZTogJ3NxbHNlcnZlci1lZScsXG4gICAgcHJvcHNUeXBlOiAnUmRzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Jkc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVTcWxTZXJ2ZXJFWCcsXG4gICAgdHlwZVZhbHVlOiAnc3Fsc2VydmVyLWV4JyxcbiAgICBwcm9wc1R5cGU6ICdSZHNFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmRzRW5naW5lJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Jkc0VuZ2luZVNxbFNlcnZlclNFJyxcbiAgICB0eXBlVmFsdWU6ICdzcWxzZXJ2ZXItc2UnLFxuICAgIHByb3BzVHlwZTogJ1Jkc0VuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZHNFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmRzRW5naW5lU3FsU2VydmVyV2ViJyxcbiAgICB0eXBlVmFsdWU6ICdzcWxzZXJ2ZXItd2ViJyxcbiAgICBwcm9wc1R5cGU6ICdSZHNFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmRzRW5naW5lJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0F1cm9yYUVuZ2luZVBvc3RncmVzcWwnLFxuICAgIHR5cGVWYWx1ZTogJ2F1cm9yYS1wb3N0Z3Jlc3FsJyxcbiAgICBwcm9wc1R5cGU6ICdBdXJvcmFFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXVyb3JhRW5naW5lJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0F1cm9yYUVuZ2luZU15c3FsJyxcbiAgICB0eXBlVmFsdWU6ICdhdXJvcmEtbXlzcWwnLFxuICAgIHByb3BzVHlwZTogJ0F1cm9yYUVuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBdXJvcmFFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXVyb3JhU2VydmVybGVzc0VuZ2luZVBvc3RncmVzcWwnLFxuICAgIHR5cGVWYWx1ZTogJ2F1cm9yYS1wb3N0Z3Jlc3FsLXNlcnZlcmxlc3MnLFxuICAgIHByb3BzVHlwZTogJ0F1cm9yYVNlcnZlcmxlc3NFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXVyb3JhU2VydmVybGVzc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBdXJvcmFTZXJ2ZXJsZXNzRW5naW5lTXlzcWwnLFxuICAgIHR5cGVWYWx1ZTogJ2F1cm9yYS1teXNxbC1zZXJ2ZXJsZXNzJyxcbiAgICBwcm9wc1R5cGU6ICdBdXJvcmFTZXJ2ZXJsZXNzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0F1cm9yYVNlcnZlcmxlc3NFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXVyb3JhU2VydmVybGVzc1YyRW5naW5lUG9zdGdyZXNxbCcsXG4gICAgdHlwZVZhbHVlOiAnYXVyb3JhLXBvc3RncmVzcWwtc2VydmVybGVzcy12MicsXG4gICAgcHJvcHNUeXBlOiAnQXVyb3JhU2VydmVybGVzc1YyRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0F1cm9yYVNlcnZlcmxlc3NWMkVuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBdXJvcmFTZXJ2ZXJsZXNzVjJFbmdpbmVNeXNxbCcsXG4gICAgdHlwZVZhbHVlOiAnYXVyb3JhLW15c3FsLXNlcnZlcmxlc3MtdjInLFxuICAgIHByb3BzVHlwZTogJ0F1cm9yYVNlcnZlcmxlc3NWMkVuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBdXJvcmFTZXJ2ZXJsZXNzVjJFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICAvLyBMYW1iZGEgUGFja2FnaW5nXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTdGFja3RhcGVMYW1iZGFCdWlsZHBhY2tQYWNrYWdpbmcnLFxuICAgIHR5cGVWYWx1ZTogJ3N0YWNrdGFwZS1sYW1iZGEtYnVpbGRwYWNrJyxcbiAgICBwcm9wc1R5cGU6ICdTdHBCdWlsZHBhY2tMYW1iZGFQYWNrYWdpbmdQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1N0cEJ1aWxkcGFja0xhbWJkYVBhY2thZ2luZycsXG4gICAgc291cmNlRmlsZTogJ2RlcGxveW1lbnQtYXJ0aWZhY3RzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDdXN0b21BcnRpZmFjdExhbWJkYVBhY2thZ2luZycsXG4gICAgdHlwZVZhbHVlOiAnY3VzdG9tLWFydGlmYWN0JyxcbiAgICBwcm9wc1R5cGU6ICdDdXN0b21BcnRpZmFjdExhbWJkYVBhY2thZ2luZ1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ3VzdG9tQXJ0aWZhY3RMYW1iZGFQYWNrYWdpbmcnLFxuICAgIHNvdXJjZUZpbGU6ICdkZXBsb3ltZW50LWFydGlmYWN0cy5kLnRzJ1xuICB9LFxuICAvLyBDb250YWluZXIgUGFja2FnaW5nXG4gIHtcbiAgICBjbGFzc05hbWU6ICdQcmVidWlsdEltYWdlUGFja2FnaW5nJyxcbiAgICB0eXBlVmFsdWU6ICdwcmVidWlsdC1pbWFnZScsXG4gICAgcHJvcHNUeXBlOiAnUHJlYnVpbHRJbWFnZUN3UGFja2FnaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdQcmVidWlsdEN3SW1hZ2VQYWNrYWdpbmcnLFxuICAgIHNvdXJjZUZpbGU6ICdkZXBsb3ltZW50LWFydGlmYWN0cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQ3VzdG9tRG9ja2VyZmlsZVBhY2thZ2luZycsXG4gICAgdHlwZVZhbHVlOiAnY3VzdG9tLWRvY2tlcmZpbGUnLFxuICAgIHByb3BzVHlwZTogJ0N1c3RvbURvY2tlcmZpbGVDd0ltYWdlUGFja2FnaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDdXN0b21Eb2NrZXJmaWxlQ3dJbWFnZVBhY2thZ2luZycsXG4gICAgc291cmNlRmlsZTogJ2RlcGxveW1lbnQtYXJ0aWZhY3RzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdFeHRlcm5hbEJ1aWxkcGFja1BhY2thZ2luZycsXG4gICAgdHlwZVZhbHVlOiAnZXh0ZXJuYWwtYnVpbGRwYWNrJyxcbiAgICBwcm9wc1R5cGU6ICdFeHRlcm5hbEJ1aWxkcGFja0N3SW1hZ2VQYWNrYWdpbmdQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0V4dGVybmFsQnVpbGRwYWNrQ3dJbWFnZVBhY2thZ2luZycsXG4gICAgc291cmNlRmlsZTogJ2RlcGxveW1lbnQtYXJ0aWZhY3RzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdOaXhwYWNrc1BhY2thZ2luZycsXG4gICAgdHlwZVZhbHVlOiAnbml4cGFja3MnLFxuICAgIHByb3BzVHlwZTogJ05peHBhY2tzQ3dJbWFnZVBhY2thZ2luZ1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTml4cGFja3NDd0ltYWdlUGFja2FnaW5nJyxcbiAgICBzb3VyY2VGaWxlOiAnZGVwbG95bWVudC1hcnRpZmFjdHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1N0YWNrdGFwZUltYWdlQnVpbGRwYWNrUGFja2FnaW5nJyxcbiAgICB0eXBlVmFsdWU6ICdzdGFja3RhcGUtaW1hZ2UtYnVpbGRwYWNrJyxcbiAgICBwcm9wc1R5cGU6ICdTdHBCdWlsZHBhY2tDd0ltYWdlUGFja2FnaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTdHBCdWlsZHBhY2tDd0ltYWdlUGFja2FnaW5nJyxcbiAgICBzb3VyY2VGaWxlOiAnZGVwbG95bWVudC1hcnRpZmFjdHMuZC50cydcbiAgfSxcbiAgLy8gTGFtYmRhIEZ1bmN0aW9uIEV2ZW50cy9JbnRlZ3JhdGlvbnNcbiAge1xuICAgIGNsYXNzTmFtZTogJ0h0dHBBcGlJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnaHR0cC1hcGktZ2F0ZXdheScsXG4gICAgcHJvcHNUeXBlOiAnSHR0cEFwaUludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdIdHRwQXBpSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1MzSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ3MzJyxcbiAgICBwcm9wc1R5cGU6ICdTM0ludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTM0ludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTY2hlZHVsZUludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdzY2hlZHVsZScsXG4gICAgcHJvcHNUeXBlOiAnU2NoZWR1bGVJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU2NoZWR1bGVJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnU25zSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ3NucycsXG4gICAgcHJvcHNUeXBlOiAnU25zSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Nuc0ludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTcXNJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnc3FzJyxcbiAgICBwcm9wc1R5cGU6ICdTcXNJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU3FzSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0tpbmVzaXNJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAna2luZXNpcycsXG4gICAgcHJvcHNUeXBlOiAnS2luZXNpc0ludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdLaW5lc2lzSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0R5bmFtb0RiSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2R5bmFtb2RiJyxcbiAgICBwcm9wc1R5cGU6ICdEeW5hbW9EYkludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdEeW5hbW9EYkludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDbG91ZHdhdGNoTG9nSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2Nsb3Vkd2F0Y2gtbG9ncycsXG4gICAgcHJvcHNUeXBlOiAnQ2xvdWR3YXRjaExvZ0ludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDbG91ZHdhdGNoTG9nSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VySW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2FwcGxpY2F0aW9uLWxvYWQtYmFsYW5jZXInLFxuICAgIHByb3BzVHlwZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VySW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VySW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0V2ZW50QnVzSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2V2ZW50LWJ1cycsXG4gICAgcHJvcHNUeXBlOiAnRXZlbnRCdXNJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnRXZlbnRCdXNJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnS2Fma2FUb3BpY0ludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdrYWZrYS10b3BpYycsXG4gICAgcHJvcHNUeXBlOiAnS2Fma2FUb3BpY0ludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdLYWZrYVRvcGljSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0FsYXJtSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2FsYXJtJyxcbiAgICBwcm9wc1R5cGU6ICdBbGFybUludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBbGFybUludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdJb3RJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnaW90JyxcbiAgICBwcm9wc1R5cGU6ICdJb3RJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnSW90SW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAgLy8gQ0ROIFJvdXRlc1xuICB7XG4gICAgY2xhc3NOYW1lOiAnQ2RuTG9hZEJhbGFuY2VyUm91dGUnLFxuICAgIHR5cGVWYWx1ZTogJ2FwcGxpY2F0aW9uLWxvYWQtYmFsYW5jZXInLFxuICAgIHByb3BzVHlwZTogJ0NkbkxvYWRCYWxhbmNlck9yaWdpbicsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0NkbkxvYWRCYWxhbmNlck9yaWdpbicsXG4gICAgc291cmNlRmlsZTogJ2Nkbi5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQ2RuSHR0cEFwaUdhdGV3YXlSb3V0ZScsXG4gICAgdHlwZVZhbHVlOiAnaHR0cC1hcGktZ2F0ZXdheScsXG4gICAgcHJvcHNUeXBlOiAnQ2RuSHR0cEFwaUdhdGV3YXlPcmlnaW4nLFxuICAgIGludGVyZmFjZU5hbWU6ICdDZG5IdHRwQXBpR2F0ZXdheU9yaWdpbicsXG4gICAgc291cmNlRmlsZTogJ2Nkbi5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQ2RuTGFtYmRhRnVuY3Rpb25Sb3V0ZScsXG4gICAgdHlwZVZhbHVlOiAnZnVuY3Rpb24nLFxuICAgIHByb3BzVHlwZTogJ0NkbkxhbWJkYUZ1bmN0aW9uT3JpZ2luJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ2RuTGFtYmRhRnVuY3Rpb25PcmlnaW4nLFxuICAgIHNvdXJjZUZpbGU6ICdjZG4uZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0NkbkN1c3RvbURvbWFpblJvdXRlJyxcbiAgICB0eXBlVmFsdWU6ICdjdXN0b20tb3JpZ2luJyxcbiAgICBwcm9wc1R5cGU6ICdDZG5DdXN0b21PcmlnaW4nLFxuICAgIGludGVyZmFjZU5hbWU6ICdDZG5DdXN0b21PcmlnaW4nLFxuICAgIHNvdXJjZUZpbGU6ICdjZG4uZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0NkbkJ1Y2tldFJvdXRlJyxcbiAgICB0eXBlVmFsdWU6ICdidWNrZXQnLFxuICAgIHByb3BzVHlwZTogJ0NkbkJ1Y2tldE9yaWdpbicsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0NkbkJ1Y2tldE9yaWdpbicsXG4gICAgc291cmNlRmlsZTogJ2Nkbi5kLnRzJ1xuICB9LFxuICAvLyBXZWIgQXBwIEZpcmV3YWxsIFJ1bGVzXG4gIHtcbiAgICBjbGFzc05hbWU6ICdNYW5hZ2VkUnVsZUdyb3VwJyxcbiAgICB0eXBlVmFsdWU6ICdtYW5hZ2VkLXJ1bGUtZ3JvdXAnLFxuICAgIHByb3BzVHlwZTogJ01hbmFnZWRSdWxlR3JvdXBQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ01hbmFnZWRSdWxlR3JvdXAnLFxuICAgIHNvdXJjZUZpbGU6ICd3ZWItYXBwLWZpcmV3YWxsLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDdXN0b21SdWxlR3JvdXAnLFxuICAgIHR5cGVWYWx1ZTogJ2N1c3RvbS1ydWxlLWdyb3VwJyxcbiAgICBwcm9wc1R5cGU6ICdDdXN0b21SdWxlR3JvdXBQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0N1c3RvbVJ1bGVHcm91cCcsXG4gICAgc291cmNlRmlsZTogJ3dlYi1hcHAtZmlyZXdhbGwuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1JhdGVCYXNlZFJ1bGUnLFxuICAgIHR5cGVWYWx1ZTogJ3JhdGUtYmFzZWQtcnVsZScsXG4gICAgcHJvcHNUeXBlOiAnUmF0ZUJhc2VkU3RhdGVtZW50UHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSYXRlQmFzZWRSdWxlJyxcbiAgICBzb3VyY2VGaWxlOiAnd2ViLWFwcC1maXJld2FsbC5kLnRzJ1xuICB9LFxuICAvLyBTUVMgUXVldWUgSW50ZWdyYXRpb25zXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTcXNRdWV1ZUV2ZW50QnVzSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2V2ZW50LWJ1cycsXG4gICAgcHJvcHNUeXBlOiAnU3FzUXVldWVFdmVudEJ1c0ludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTcXNRdWV1ZUV2ZW50QnVzSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdzcXMtcXVldWVzLmQudHMnXG4gIH0sXG4gIC8vIE11bHRpIENvbnRhaW5lciBXb3JrbG9hZCBJbnRlZ3JhdGlvbnNcbiAge1xuICAgIGNsYXNzTmFtZTogJ011bHRpQ29udGFpbmVyV29ya2xvYWRIdHRwQXBpSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2h0dHAtYXBpLWdhdGV3YXknLFxuICAgIHByb3BzVHlwZTogJ0NvbnRhaW5lcldvcmtsb2FkSHR0cEFwaUludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDb250YWluZXJXb3JrbG9hZEh0dHBBcGlJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ211bHRpLWNvbnRhaW5lci13b3JrbG9hZHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ011bHRpQ29udGFpbmVyV29ya2xvYWRMb2FkQmFsYW5jZXJJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlcicsXG4gICAgcHJvcHNUeXBlOiAnQ29udGFpbmVyV29ya2xvYWRMb2FkQmFsYW5jZXJJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ29udGFpbmVyV29ya2xvYWRMb2FkQmFsYW5jZXJJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ211bHRpLWNvbnRhaW5lci13b3JrbG9hZHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ011bHRpQ29udGFpbmVyV29ya2xvYWROZXR3b3JrTG9hZEJhbGFuY2VySW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ25ldHdvcmstbG9hZC1iYWxhbmNlcicsXG4gICAgcHJvcHNUeXBlOiAnQ29udGFpbmVyV29ya2xvYWROZXR3b3JrTG9hZEJhbGFuY2VySW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0NvbnRhaW5lcldvcmtsb2FkTmV0d29ya0xvYWRCYWxhbmNlckludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnbXVsdGktY29udGFpbmVyLXdvcmtsb2Fkcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTXVsdGlDb250YWluZXJXb3JrbG9hZEludGVybmFsSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ3dvcmtsb2FkLWludGVybmFsJyxcbiAgICBwcm9wc1R5cGU6ICdDb250YWluZXJXb3JrbG9hZEludGVybmFsSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0NvbnRhaW5lcldvcmtsb2FkSW50ZXJuYWxJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ211bHRpLWNvbnRhaW5lci13b3JrbG9hZHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ011bHRpQ29udGFpbmVyV29ya2xvYWRTZXJ2aWNlQ29ubmVjdEludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdzZXJ2aWNlLWNvbm5lY3QnLFxuICAgIHByb3BzVHlwZTogJ0NvbnRhaW5lcldvcmtsb2FkU2VydmljZUNvbm5lY3RJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ29udGFpbmVyV29ya2xvYWRTZXJ2aWNlQ29ubmVjdEludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnbXVsdGktY29udGFpbmVyLXdvcmtsb2Fkcy5kLnRzJ1xuICB9LFxuICAvLyBTY3JpcHRzXG4gIHtcbiAgICBjbGFzc05hbWU6ICdMb2NhbFNjcmlwdCcsXG4gICAgdHlwZVZhbHVlOiAnbG9jYWwtc2NyaXB0JyxcbiAgICBwcm9wc1R5cGU6ICdMb2NhbFNjcmlwdFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTG9jYWxTY3JpcHQnLFxuICAgIHNvdXJjZUZpbGU6ICdfX2hlbHBlcnMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0Jhc3Rpb25TY3JpcHQnLFxuICAgIHR5cGVWYWx1ZTogJ2Jhc3Rpb24tc2NyaXB0JyxcbiAgICBwcm9wc1R5cGU6ICdCYXN0aW9uU2NyaXB0UHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdCYXN0aW9uU2NyaXB0JyxcbiAgICBzb3VyY2VGaWxlOiAnX19oZWxwZXJzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdMb2NhbFNjcmlwdFdpdGhCYXN0aW9uVHVubmVsaW5nJyxcbiAgICB0eXBlVmFsdWU6ICdsb2NhbC1zY3JpcHQtd2l0aC1iYXN0aW9uLXR1bm5lbGluZycsXG4gICAgcHJvcHNUeXBlOiAnTG9jYWxTY3JpcHRXaXRoQmFzdGlvblR1bm5lbGluZ1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTG9jYWxTY3JpcHRXaXRoQmFzdGlvblR1bm5lbGluZycsXG4gICAgc291cmNlRmlsZTogJ19faGVscGVycy5kLnRzJ1xuICB9LFxuICAvLyBMb2cgRm9yd2FyZGluZ1xuICB7XG4gICAgY2xhc3NOYW1lOiAnSHR0cEVuZHBvaW50TG9nRm9yd2FyZGluZycsXG4gICAgdHlwZVZhbHVlOiAnaHR0cC1lbmRwb2ludCcsXG4gICAgcHJvcHNUeXBlOiAnSHR0cEVuZHBvaW50TG9nRm9yd2FyZGluZ1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnSHR0cEVuZHBvaW50TG9nRm9yd2FyZGluZycsXG4gICAgc291cmNlRmlsZTogJ19faGVscGVycy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnSGlnaGxpZ2h0TG9nRm9yd2FyZGluZycsXG4gICAgdHlwZVZhbHVlOiAnaGlnaGxpZ2h0JyxcbiAgICBwcm9wc1R5cGU6ICdIaWdobGlnaHRMb2dGb3J3YXJkaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdIaWdobGlnaHRMb2dGb3J3YXJkaW5nJyxcbiAgICBzb3VyY2VGaWxlOiAnX19oZWxwZXJzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdEYXRhZG9nTG9nRm9yd2FyZGluZycsXG4gICAgdHlwZVZhbHVlOiAnZGF0YWRvZycsXG4gICAgcHJvcHNUeXBlOiAnRGF0YWRvZ0xvZ0ZvcndhcmRpbmdQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0RhdGFkb2dMb2dGb3J3YXJkaW5nJyxcbiAgICBzb3VyY2VGaWxlOiAnX19oZWxwZXJzLmQudHMnXG4gIH0sXG4gIC8vIEJ1Y2tldCBMaWZlY3ljbGUgUnVsZXNcbiAge1xuICAgIGNsYXNzTmFtZTogJ0V4cGlyYXRpb25MaWZlY3ljbGVSdWxlJyxcbiAgICB0eXBlVmFsdWU6ICdleHBpcmF0aW9uJyxcbiAgICBwcm9wc1R5cGU6ICdFeHBpcmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdFeHBpcmF0aW9uTGlmZWN5Y2xlUnVsZScsXG4gICAgc291cmNlRmlsZTogJ2J1Y2tldHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ05vbkN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbkxpZmVjeWNsZVJ1bGUnLFxuICAgIHR5cGVWYWx1ZTogJ25vbi1jdXJyZW50LXZlcnNpb24tZXhwaXJhdGlvbicsXG4gICAgcHJvcHNUeXBlOiAnTm9uQ3VycmVudFZlcnNpb25FeHBpcmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdOb25DdXJyZW50VmVyc2lvbkV4cGlyYXRpb25MaWZlY3ljbGVSdWxlJyxcbiAgICBzb3VyY2VGaWxlOiAnYnVja2V0cy5kLnRzJ1xuICB9LFxuICAvLyBFRlMgTW91bnRzXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDb250YWluZXJFZnNNb3VudCcsXG4gICAgdHlwZVZhbHVlOiAnZWZzJyxcbiAgICBwcm9wc1R5cGU6ICdDb250YWluZXJFZnNNb3VudFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ29udGFpbmVyRWZzTW91bnQnLFxuICAgIHNvdXJjZUZpbGU6ICdfX2hlbHBlcnMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0xhbWJkYUVmc01vdW50JyxcbiAgICB0eXBlVmFsdWU6ICdlZnMnLFxuICAgIHByb3BzVHlwZTogJ0xhbWJkYUVmc01vdW50UHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdMYW1iZGFFZnNNb3VudCcsXG4gICAgc291cmNlRmlsZTogJ2Z1bmN0aW9ucy5kLnRzJ1xuICB9LFxuICAvLyBBdXRob3JpemVyc1xuICB7XG4gICAgY2xhc3NOYW1lOiAnQ29nbml0b0F1dGhvcml6ZXInLFxuICAgIHR5cGVWYWx1ZTogJ2NvZ25pdG8nLFxuICAgIHByb3BzVHlwZTogJ0NvZ25pdG9BdXRob3JpemVyUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0NvZ25pdG9BdXRob3JpemVyJyxcbiAgICBzb3VyY2VGaWxlOiAndXNlci1wb29scy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTGFtYmRhQXV0aG9yaXplcicsXG4gICAgdHlwZVZhbHVlOiAnbGFtYmRhJyxcbiAgICBwcm9wc1R5cGU6ICdMYW1iZGFBdXRob3JpemVyUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0xhbWJkYUF1dGhvcml6ZXInLFxuICAgIHNvdXJjZUZpbGU6ICd1c2VyLXBvb2xzLmQudHMnXG4gIH0sXG4gIC8vIEFsYXJtIFRyaWdnZXJzXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlckN1c3RvbVRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2FwcGxpY2F0aW9uLWxvYWQtYmFsYW5jZXItY3VzdG9tJyxcbiAgICBwcm9wc1R5cGU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlckN1c3RvbVRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyQ3VzdG9tVHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtLW1ldHJpY3MuZC50cycsXG4gICAganNkb2M6XG4gICAgICAnVHJpZ2dlcnMgYW4gYWxhcm0gYmFzZWQgb24gYW55IEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXIgQ2xvdWRXYXRjaCBtZXRyaWMgKGUuZy4sIGNvbm5lY3Rpb24gY291bnRzLCByZXF1ZXN0IGNvdW50cywgdGFyZ2V0IHJlc3BvbnNlIHRpbWVzKS4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlckVycm9yUmF0ZVRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2FwcGxpY2F0aW9uLWxvYWQtYmFsYW5jZXItZXJyb3ItcmF0ZScsXG4gICAgcHJvcHNUeXBlOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJFcnJvclJhdGVUcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlckVycm9yUmF0ZVRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6XG4gICAgICAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiB0aGUgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlciBlcnJvciByYXRlIChwZXJjZW50YWdlIG9mIDR4eC81eHggcmVzcG9uc2VzKSBleGNlZWRzIHRoZSB0aHJlc2hvbGQuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJVbmhlYWx0aHlUYXJnZXRzVHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlci11bmhlYWx0aHktdGFyZ2V0cycsXG4gICAgcHJvcHNUeXBlOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJVbmhlYWx0aHlUYXJnZXRzVHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJVbmhlYWx0aHlUYXJnZXRzVHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzpcbiAgICAgICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIHRoZSBwZXJjZW50YWdlIG9mIHVuaGVhbHRoeSB0YXJnZXRzIGJlaGluZCB0aGUgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlciBleGNlZWRzIHRoZSB0aHJlc2hvbGQuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnSHR0cEFwaUdhdGV3YXlFcnJvclJhdGVUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdodHRwLWFwaS1nYXRld2F5LWVycm9yLXJhdGUnLFxuICAgIHByb3BzVHlwZTogJ0h0dHBBcGlHYXRld2F5RXJyb3JSYXRlVHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnSHR0cEFwaUdhdGV3YXlFcnJvclJhdGVUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOlxuICAgICAgJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gdGhlIEhUVFAgQVBJIEdhdGV3YXkgZXJyb3IgcmF0ZSAocGVyY2VudGFnZSBvZiA0eHgvNXh4IHJlc3BvbnNlcykgZXhjZWVkcyB0aGUgdGhyZXNob2xkLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0h0dHBBcGlHYXRld2F5TGF0ZW5jeVRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2h0dHAtYXBpLWdhdGV3YXktbGF0ZW5jeScsXG4gICAgcHJvcHNUeXBlOiAnSHR0cEFwaUdhdGV3YXlMYXRlbmN5VHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnSHR0cEFwaUdhdGV3YXlMYXRlbmN5VHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzpcbiAgICAgICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIEhUVFAgQVBJIEdhdGV3YXkgbGF0ZW5jeSBleGNlZWRzIHRoZSB0aHJlc2hvbGQuIExhdGVuY3kgaXMgbWVhc3VyZWQgZnJvbSByZXF1ZXN0IHJlY2VpcHQgdG8gcmVzcG9uc2Ugc2VudC4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VSZWFkTGF0ZW5jeVRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2RhdGFiYXNlLXJlYWQtbGF0ZW5jeScsXG4gICAgcHJvcHNUeXBlOiAnUmVsYXRpb25hbERhdGFiYXNlUmVhZExhdGVuY3lUcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VSZWFkTGF0ZW5jeVRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6ICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIGRhdGFiYXNlIHJlYWQgbGF0ZW5jeSAoYXZlcmFnZSB0aW1lIGZvciByZWFkIEkvTyBvcGVyYXRpb25zKSBleGNlZWRzIHRoZSB0aHJlc2hvbGQuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlV3JpdGVMYXRlbmN5VHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnZGF0YWJhc2Utd3JpdGUtbGF0ZW5jeScsXG4gICAgcHJvcHNUeXBlOiAnUmVsYXRpb25hbERhdGFiYXNlV3JpdGVMYXRlbmN5VHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlV3JpdGVMYXRlbmN5VHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzpcbiAgICAgICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIGRhdGFiYXNlIHdyaXRlIGxhdGVuY3kgKGF2ZXJhZ2UgdGltZSBmb3Igd3JpdGUgSS9PIG9wZXJhdGlvbnMpIGV4Y2VlZHMgdGhlIHRocmVzaG9sZC4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VDUFVVdGlsaXphdGlvblRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2RhdGFiYXNlLWNwdS11dGlsaXphdGlvbicsXG4gICAgcHJvcHNUeXBlOiAnUmVsYXRpb25hbERhdGFiYXNlQ1BVVXRpbGl6YXRpb25UcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VDUFVVdGlsaXphdGlvblRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6ICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIGRhdGFiYXNlIENQVSB1dGlsaXphdGlvbiBleGNlZWRzIHRoZSB0aHJlc2hvbGQgcGVyY2VudGFnZS4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VGcmVlU3RvcmFnZVRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2RhdGFiYXNlLWZyZWUtc3RvcmFnZScsXG4gICAgcHJvcHNUeXBlOiAnUmVsYXRpb25hbERhdGFiYXNlRnJlZVN0b3JhZ2VUcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VGcmVlU3RvcmFnZVRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6ICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIGF2YWlsYWJsZSBkYXRhYmFzZSBzdG9yYWdlIGZhbGxzIGJlbG93IHRoZSB0aHJlc2hvbGQgKGluIE1CKS4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VGcmVlTWVtb3J5VHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnZGF0YWJhc2UtZnJlZS1tZW1vcnknLFxuICAgIHByb3BzVHlwZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUZyZWVNZW1vcnlUcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VGcmVlTWVtb3J5VHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzogJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gYXZhaWxhYmxlIGRhdGFiYXNlIG1lbW9yeSBmYWxscyBiZWxvdyB0aGUgdGhyZXNob2xkIChpbiBNQikuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlQ29ubmVjdGlvbkNvdW50VHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnZGF0YWJhc2UtY29ubmVjdGlvbi1jb3VudCcsXG4gICAgcHJvcHNUeXBlOiAnUmVsYXRpb25hbERhdGFiYXNlQ29ubmVjdGlvbkNvdW50VHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlQ29ubmVjdGlvbkNvdW50VHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzogJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gdGhlIG51bWJlciBvZiBkYXRhYmFzZSBjb25uZWN0aW9ucyBleGNlZWRzIHRoZSB0aHJlc2hvbGQuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnU3FzUXVldWVSZWNlaXZlZE1lc3NhZ2VzQ291bnRUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdzcXMtcXVldWUtcmVjZWl2ZWQtbWVzc2FnZXMtY291bnQnLFxuICAgIHByb3BzVHlwZTogJ1Nxc1F1ZXVlUmVjZWl2ZWRNZXNzYWdlc0NvdW50VHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU3FzUXVldWVSZWNlaXZlZE1lc3NhZ2VzQ291bnRUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOiAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiB0aGUgbnVtYmVyIG9mIG1lc3NhZ2VzIHJlY2VpdmVkIGZyb20gYW4gU1FTIHF1ZXVlIGNyb3NzZXMgdGhlIHRocmVzaG9sZC4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTcXNRdWV1ZU5vdEVtcHR5VHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnc3FzLXF1ZXVlLW5vdC1lbXB0eScsXG4gICAgcHJvcHNUeXBlOiAnU3FzUXVldWVOb3RFbXB0eVRyaWdnZXInLFxuICAgIGludGVyZmFjZU5hbWU6ICdTcXNRdWV1ZU5vdEVtcHR5VHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICB0eXBlT25seTogdHJ1ZSxcbiAgICBqc2RvYzogJ1RyaWdnZXJzIGFuIGFsYXJtIGlmIHRoZSBTUVMgcXVldWUgaXMgbm90IGVtcHR5LiBVc2VmdWwgZm9yIG1vbml0b3JpbmcgZGVhZC1sZXR0ZXIgcXVldWVzLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0xhbWJkYUVycm9yUmF0ZVRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2xhbWJkYS1lcnJvci1yYXRlJyxcbiAgICBwcm9wc1R5cGU6ICdMYW1iZGFFcnJvclJhdGVUcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdMYW1iZGFFcnJvclJhdGVUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOlxuICAgICAgJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gdGhlIExhbWJkYSBmdW5jdGlvbiBlcnJvciByYXRlIChwZXJjZW50YWdlIG9mIGZhaWxlZCBpbnZvY2F0aW9ucykgZXhjZWVkcyB0aGUgdGhyZXNob2xkLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0xhbWJkYUR1cmF0aW9uVHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnbGFtYmRhLWR1cmF0aW9uJyxcbiAgICBwcm9wc1R5cGU6ICdMYW1iZGFEdXJhdGlvblRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0xhbWJkYUR1cmF0aW9uVHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzogJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gTGFtYmRhIGZ1bmN0aW9uIGV4ZWN1dGlvbiBkdXJhdGlvbiBleGNlZWRzIHRoZSB0aHJlc2hvbGQgKGluIG1pbGxpc2Vjb25kcykuJ1xuICB9LFxuICAvLyBDdXN0b20gUmVzb3VyY2VzXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDdXN0b21SZXNvdXJjZURlZmluaXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2N1c3RvbS1yZXNvdXJjZS1kZWZpbml0aW9uJyxcbiAgICBwcm9wc1R5cGU6ICdDdXN0b21SZXNvdXJjZURlZmluaXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0N1c3RvbVJlc291cmNlRGVmaW5pdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2N1c3RvbS1yZXNvdXJjZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0N1c3RvbVJlc291cmNlSW5zdGFuY2UnLFxuICAgIHR5cGVWYWx1ZTogJ2N1c3RvbS1yZXNvdXJjZS1pbnN0YW5jZScsXG4gICAgcHJvcHNUeXBlOiAnQ3VzdG9tUmVzb3VyY2VJbnN0YW5jZVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ3VzdG9tUmVzb3VyY2VJbnN0YW5jZScsXG4gICAgc291cmNlRmlsZTogJ2N1c3RvbS1yZXNvdXJjZXMuZC50cydcbiAgfSxcbiAgLy8gRGVwbG95bWVudCBTY3JpcHRzXG4gIHtcbiAgICBjbGFzc05hbWU6ICdEZXBsb3ltZW50U2NyaXB0JyxcbiAgICB0eXBlVmFsdWU6ICdkZXBsb3ltZW50LXNjcmlwdCcsXG4gICAgcHJvcHNUeXBlOiAnRGVwbG95bWVudFNjcmlwdFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnRGVwbG95bWVudFNjcmlwdCcsXG4gICAgc291cmNlRmlsZTogJ2RlcGxveW1lbnQtc2NyaXB0LmQudHMnXG4gIH0sXG4gIC8vIEVkZ2UgTGFtYmRhIEZ1bmN0aW9uc1xuICB7XG4gICAgY2xhc3NOYW1lOiAnRWRnZUxhbWJkYUZ1bmN0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdlZGdlLWxhbWJkYS1mdW5jdGlvbicsXG4gICAgcHJvcHNUeXBlOiAnRWRnZUxhbWJkYUZ1bmN0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdFZGdlTGFtYmRhRnVuY3Rpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdlZGdlLWxhbWJkYS1mdW5jdGlvbnMuZC50cydcbiAgfVxuXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT0gSEVMUEVSIEZVTkNUSU9OUyA9PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVzb3VyY2VCeUNsYXNzTmFtZShjbGFzc05hbWU6IHN0cmluZyk6IFJlc291cmNlRGVmaW5pdGlvbiB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiBSRVNPVVJDRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUy5maW5kKChyKSA9PiByLmNsYXNzTmFtZSA9PT0gY2xhc3NOYW1lKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJlc291cmNlQnlUeXBlKHJlc291cmNlVHlwZTogc3RyaW5nKTogUmVzb3VyY2VEZWZpbml0aW9uIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIFJFU09VUkNFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLmZpbmQoKHIpID0+IHIucmVzb3VyY2VUeXBlID09PSByZXNvdXJjZVR5cGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVzb3VyY2VzV2l0aEF1Z21lbnRlZFByb3BzKCk6IFJlc291cmNlRGVmaW5pdGlvbltdIHtcbiAgcmV0dXJuIFJFU09VUkNFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLmZpbHRlcigocikgPT4gci5oYXNBdWdtZW50ZWRQcm9wcyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXNvdXJjZXNXaXRoT3ZlcnJpZGVzKCk6IFJlc291cmNlRGVmaW5pdGlvbltdIHtcbiAgcmV0dXJuIFJFU09VUkNFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLmZpbHRlcigocikgPT4gci5zdXBwb3J0c092ZXJyaWRlcyAhPT0gZmFsc2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZVByb3BlcnRpZXNCeUNsYXNzTmFtZShjbGFzc05hbWU6IHN0cmluZyk6IFR5cGVQcm9wZXJ0aWVzRGVmaW5pdGlvbiB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiBNSVNDX1RZUEVTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMuZmluZCgodCkgPT4gdC5jbGFzc05hbWUgPT09IGNsYXNzTmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlUHJvcGVydGllc0J5VHlwZVZhbHVlKHR5cGVWYWx1ZTogc3RyaW5nKTogVHlwZVByb3BlcnRpZXNEZWZpbml0aW9uIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIE1JU0NfVFlQRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUy5maW5kKCh0KSA9PiB0LnR5cGVWYWx1ZSA9PT0gdHlwZVZhbHVlKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT0gREVSSVZFRCBNQVBQSU5HUyA9PT09PT09PT09PT09PT09PT09PVxuXG4vKiogUmVzb3VyY2UgdHlwZSDihpIgY2xhc3MgbmFtZSBtYXBwaW5nICovXG5leHBvcnQgY29uc3QgUkVTT1VSQ0VfVFlQRV9UT19DTEFTUzogUmVjb3JkPHN0cmluZywgUmVzb3VyY2VDbGFzc05hbWU+ID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuICBSRVNPVVJDRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUy5tYXAoKHIpID0+IFtyLnJlc291cmNlVHlwZSwgci5jbGFzc05hbWVdKVxuKTtcblxuLyoqIFNjcmlwdCB0eXBlIOKGkiBjbGFzcyBuYW1lIG1hcHBpbmcgKi9cbmV4cG9ydCBjb25zdCBTQ1JJUFRfVFlQRV9UT19DTEFTUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgTUlTQ19UWVBFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLmZpbHRlcihcbiAgICAodCkgPT4gdC5zb3VyY2VGaWxlID09PSAnX19oZWxwZXJzLmQudHMnICYmIHQucHJvcHNUeXBlLmluY2x1ZGVzKCdTY3JpcHQnKVxuICApLm1hcCgodCkgPT4gW3QudHlwZVZhbHVlLCB0LmNsYXNzTmFtZV0pXG4pO1xuXG4vKiogUGFja2FnaW5nIHR5cGUg4oaSIGNsYXNzIG5hbWUgbWFwcGluZyAqL1xuZXhwb3J0IGNvbnN0IFBBQ0tBR0lOR19UWVBFX1RPX0NMQVNTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuICBNSVNDX1RZUEVTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMuZmlsdGVyKCh0KSA9PiB0LnNvdXJjZUZpbGUgPT09ICdkZXBsb3ltZW50LWFydGlmYWN0cy5kLnRzJykubWFwKCh0KSA9PiBbXG4gICAgdC50eXBlVmFsdWUsXG4gICAgdC5jbGFzc05hbWVcbiAgXSlcbik7XG5cbi8qKiBFbmdpbmUgdHlwZSDihpIgY2xhc3MgbmFtZSBtYXBwaW5nICovXG5leHBvcnQgY29uc3QgRU5HSU5FX1RZUEVfVE9fQ0xBU1M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gIE1JU0NfVFlQRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUy5maWx0ZXIoKHQpID0+IHQucHJvcHNUeXBlLmluY2x1ZGVzKCdFbmdpbmUnKSkubWFwKCh0KSA9PiBbdC50eXBlVmFsdWUsIHQuY2xhc3NOYW1lXSlcbik7XG4iLAogICAgIi8vIFJlLWV4cG9ydCBmcm9tIGNsYXNzLWNvbmZpZyAoc2luZ2xlIHNvdXJjZSBvZiB0cnV0aClcbmV4cG9ydCB7XG4gIGdldFJlc291cmNlQnlDbGFzc05hbWUsXG4gIGdldFJlc291cmNlQnlUeXBlLFxuICBnZXRSZXNvdXJjZXNXaXRoQXVnbWVudGVkUHJvcHMsXG4gIGdldFJlc291cmNlc1dpdGhPdmVycmlkZXMsXG4gIGdldFR5cGVQcm9wZXJ0aWVzQnlDbGFzc05hbWUsXG4gIGdldFR5cGVQcm9wZXJ0aWVzQnlUeXBlVmFsdWUsXG4gIE1JU0NfVFlQRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUyxcbiAgdHlwZSBSZXNvdXJjZURlZmluaXRpb24sXG4gIFJFU09VUkNFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLFxuICB0eXBlIFR5cGVQcm9wZXJ0aWVzRGVmaW5pdGlvblxufSBmcm9tICcuL2NsYXNzLWNvbmZpZyc7XG5cbi8vIFRoZXNlIGNhbiBiZSByZWZlcmVuY2VkIHVzaW5nICRSZXNvdXJjZVBhcmFtIGRpcmVjdGl2ZVxuZXhwb3J0IGNvbnN0IFJFRkVSRU5DRUFCTEVfUEFSQU1TOiBSZWNvcmQ8c3RyaW5nLCBBcnJheTx7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb246IHN0cmluZyB9Pj4gPSB7XG4gICdyZWxhdGlvbmFsLWRhdGFiYXNlJzogW1xuICAgIHsgbmFtZTogJ2Nvbm5lY3Rpb25TdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Nvbm5lY3Rpb24gc3RyaW5nIGZvciB0aGUgZGF0YWJhc2UnIH0sXG4gICAgeyBuYW1lOiAnamRiY0Nvbm5lY3Rpb25TdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0pEQkMgY29ubmVjdGlvbiBzdHJpbmcnIH0sXG4gICAgeyBuYW1lOiAnaG9zdCcsIGRlc2NyaXB0aW9uOiAnRGF0YWJhc2UgaG9zdCcgfSxcbiAgICB7IG5hbWU6ICdwb3J0JywgZGVzY3JpcHRpb246ICdEYXRhYmFzZSBwb3J0JyB9LFxuICAgIHsgbmFtZTogJ2RiTmFtZScsIGRlc2NyaXB0aW9uOiAnRGF0YWJhc2UgbmFtZScgfSxcbiAgICB7IG5hbWU6ICdyZWFkZXJIb3N0JywgZGVzY3JpcHRpb246ICdSZWFkZXIgZW5kcG9pbnQgaG9zdCcgfSxcbiAgICB7IG5hbWU6ICdyZWFkZXJDb25uZWN0aW9uU3RyaW5nJywgZGVzY3JpcHRpb246ICdSZWFkZXIgY29ubmVjdGlvbiBzdHJpbmcnIH0sXG4gICAgeyBuYW1lOiAncmVhZGVySmRiY0Nvbm5lY3Rpb25TdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JlYWRlciBKREJDIGNvbm5lY3Rpb24gc3RyaW5nJyB9XG4gIF0sXG4gICd3ZWItc2VydmljZSc6IFtcbiAgICB7IG5hbWU6ICdkb21haW4nLCBkZXNjcmlwdGlvbjogJ1dlYiBzZXJ2aWNlIGRvbWFpbicgfSxcbiAgICB7IG5hbWU6ICd1cmwnLCBkZXNjcmlwdGlvbjogJ1dlYiBzZXJ2aWNlIFVSTCcgfSxcbiAgICB7IG5hbWU6ICdjdXN0b21Eb21haW5zJywgZGVzY3JpcHRpb246ICdDdXN0b20gZG9tYWlucycgfSxcbiAgICB7IG5hbWU6ICdjdXN0b21Eb21haW5VcmxzJywgZGVzY3JpcHRpb246ICdDdXN0b20gZG9tYWluIFVSTHMnIH1cbiAgXSxcbiAgJ3ByaXZhdGUtc2VydmljZSc6IFt7IG5hbWU6ICdhZGRyZXNzJywgZGVzY3JpcHRpb246ICdQcml2YXRlIHNlcnZpY2UgYWRkcmVzcycgfV0sXG4gIGJ1Y2tldDogW1xuICAgIHsgbmFtZTogJ25hbWUnLCBkZXNjcmlwdGlvbjogJ0J1Y2tldCBuYW1lJyB9LFxuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnQnVja2V0IEFSTicgfVxuICBdLFxuICAnZHluYW1vLWRiLXRhYmxlJzogW1xuICAgIHsgbmFtZTogJ25hbWUnLCBkZXNjcmlwdGlvbjogJ1RhYmxlIG5hbWUnIH0sXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdUYWJsZSBBUk4nIH0sXG4gICAgeyBuYW1lOiAnc3RyZWFtQXJuJywgZGVzY3JpcHRpb246ICdTdHJlYW0gQVJOJyB9XG4gIF0sXG4gIGZ1bmN0aW9uOiBbXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdGdW5jdGlvbiBBUk4nIH0sXG4gICAgeyBuYW1lOiAnbG9nR3JvdXBBcm4nLCBkZXNjcmlwdGlvbjogJ0xvZyBncm91cCBBUk4nIH1cbiAgXSxcbiAgJ2JhdGNoLWpvYic6IFtcbiAgICB7IG5hbWU6ICdqb2JEZWZpbml0aW9uQXJuJywgZGVzY3JpcHRpb246ICdKb2IgZGVmaW5pdGlvbiBBUk4nIH0sXG4gICAgeyBuYW1lOiAnc3RhdGVNYWNoaW5lQXJuJywgZGVzY3JpcHRpb246ICdTdGF0ZSBtYWNoaW5lIEFSTicgfSxcbiAgICB7IG5hbWU6ICdsb2dHcm91cEFybicsIGRlc2NyaXB0aW9uOiAnTG9nIGdyb3VwIEFSTicgfVxuICBdLFxuICAnZXZlbnQtYnVzJzogW1xuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnRXZlbnQgYnVzIEFSTicgfSxcbiAgICB7IG5hbWU6ICdhcmNoaXZlQXJuJywgZGVzY3JpcHRpb246ICdBcmNoaXZlIEFSTicgfVxuICBdLFxuICAnaHR0cC1hcGktZ2F0ZXdheSc6IFtcbiAgICB7IG5hbWU6ICdkb21haW4nLCBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGRvbWFpbicgfSxcbiAgICB7IG5hbWU6ICd1cmwnLCBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCcgfSxcbiAgICB7IG5hbWU6ICdjdXN0b21Eb21haW5zJywgZGVzY3JpcHRpb246ICdDdXN0b20gZG9tYWlucycgfSxcbiAgICB7IG5hbWU6ICdjdXN0b21Eb21haW5VcmxzJywgZGVzY3JpcHRpb246ICdDdXN0b20gZG9tYWluIFVSTHMnIH0sXG4gICAgeyBuYW1lOiAnY3VzdG9tRG9tYWluVXJsJywgZGVzY3JpcHRpb246ICdGaXJzdCBjdXN0b20gZG9tYWluIFVSTCcgfVxuICBdLFxuICAnbW9uZ28tZGItYXRsYXMtY2x1c3Rlcic6IFt7IG5hbWU6ICdjb25uZWN0aW9uU3RyaW5nJywgZGVzY3JpcHRpb246ICdNb25nb0RCIGNvbm5lY3Rpb24gc3RyaW5nJyB9XSxcbiAgJ3JlZGlzLWNsdXN0ZXInOiBbXG4gICAgeyBuYW1lOiAnaG9zdCcsIGRlc2NyaXB0aW9uOiAnUmVkaXMgaG9zdCcgfSxcbiAgICB7IG5hbWU6ICdyZWFkZXJIb3N0JywgZGVzY3JpcHRpb246ICdSZWRpcyByZWFkZXIgaG9zdCcgfSxcbiAgICB7IG5hbWU6ICdwb3J0JywgZGVzY3JpcHRpb246ICdSZWRpcyBwb3J0JyB9LFxuICAgIHsgbmFtZTogJ3NoYXJkaW5nJywgZGVzY3JpcHRpb246ICdTaGFyZGluZyBzdGF0dXMnIH1cbiAgXSxcbiAgJ3N0YXRlLW1hY2hpbmUnOiBbXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdTdGF0ZSBtYWNoaW5lIEFSTicgfSxcbiAgICB7IG5hbWU6ICduYW1lJywgZGVzY3JpcHRpb246ICdTdGF0ZSBtYWNoaW5lIG5hbWUnIH1cbiAgXSxcbiAgJ3VzZXItYXV0aC1wb29sJzogW1xuICAgIHsgbmFtZTogJ2lkJywgZGVzY3JpcHRpb246ICdVc2VyIHBvb2wgSUQnIH0sXG4gICAgeyBuYW1lOiAnY2xpZW50SWQnLCBkZXNjcmlwdGlvbjogJ0NsaWVudCBJRCcgfSxcbiAgICB7IG5hbWU6ICdkb21haW4nLCBkZXNjcmlwdGlvbjogJ1VzZXIgcG9vbCBkb21haW4nIH1cbiAgXSxcbiAgJ3Vwc3Rhc2gtcmVkaXMnOiBbXG4gICAgeyBuYW1lOiAnaG9zdCcsIGRlc2NyaXB0aW9uOiAnVXBzdGFzaCBSZWRpcyBob3N0JyB9LFxuICAgIHsgbmFtZTogJ3BvcnQnLCBkZXNjcmlwdGlvbjogJ1Vwc3Rhc2ggUmVkaXMgcG9ydCcgfSxcbiAgICB7IG5hbWU6ICdwYXNzd29yZCcsIGRlc2NyaXB0aW9uOiAnUGFzc3dvcmQnIH0sXG4gICAgeyBuYW1lOiAncmVzdFRva2VuJywgZGVzY3JpcHRpb246ICdSRVNUIHRva2VuJyB9LFxuICAgIHsgbmFtZTogJ3JlYWRPbmx5UmVzdFRva2VuJywgZGVzY3JpcHRpb246ICdSZWFkLW9ubHkgUkVTVCB0b2tlbicgfSxcbiAgICB7IG5hbWU6ICdyZXN0VXJsJywgZGVzY3JpcHRpb246ICdSRVNUIFVSTCcgfSxcbiAgICB7IG5hbWU6ICdyZWRpc1VybCcsIGRlc2NyaXB0aW9uOiAnUmVkaXMgVVJMJyB9XG4gIF0sXG4gICdhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyJzogW1xuICAgIHsgbmFtZTogJ2RvbWFpbicsIGRlc2NyaXB0aW9uOiAnTG9hZCBiYWxhbmNlciBkb21haW4nIH0sXG4gICAgeyBuYW1lOiAnY3VzdG9tRG9tYWlucycsIGRlc2NyaXB0aW9uOiAnQ3VzdG9tIGRvbWFpbnMnIH1cbiAgXSxcbiAgJ25ldHdvcmstbG9hZC1iYWxhbmNlcic6IFtcbiAgICB7IG5hbWU6ICdkb21haW4nLCBkZXNjcmlwdGlvbjogJ0xvYWQgYmFsYW5jZXIgZG9tYWluJyB9LFxuICAgIHsgbmFtZTogJ2N1c3RvbURvbWFpbnMnLCBkZXNjcmlwdGlvbjogJ0N1c3RvbSBkb21haW5zJyB9XG4gIF0sXG4gICdob3N0aW5nLWJ1Y2tldCc6IFtcbiAgICB7IG5hbWU6ICduYW1lJywgZGVzY3JpcHRpb246ICdCdWNrZXQgbmFtZScgfSxcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ0J1Y2tldCBBUk4nIH1cbiAgXSxcbiAgJ3dlYi1hcHAtZmlyZXdhbGwnOiBbXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdGaXJld2FsbCBBUk4nIH0sXG4gICAgeyBuYW1lOiAnc2NvcGUnLCBkZXNjcmlwdGlvbjogJ0ZpcmV3YWxsIHNjb3BlJyB9XG4gIF0sXG4gICdvcGVuLXNlYXJjaC1kb21haW4nOiBbXG4gICAgeyBuYW1lOiAnZG9tYWluRW5kcG9pbnQnLCBkZXNjcmlwdGlvbjogJ09wZW5TZWFyY2ggZG9tYWluIGVuZHBvaW50JyB9LFxuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnRG9tYWluIEFSTicgfVxuICBdLFxuICAnZWZzLWZpbGVzeXN0ZW0nOiBbXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdFRlMgQVJOJyB9LFxuICAgIHsgbmFtZTogJ2lkJywgZGVzY3JpcHRpb246ICdFRlMgSUQnIH1cbiAgXSxcbiAgJ25leHRqcy13ZWInOiBbeyBuYW1lOiAndXJsJywgZGVzY3JpcHRpb246ICdXZWJzaXRlIFVSTCcgfV0sXG4gICdhc3Ryby13ZWInOiBbeyBuYW1lOiAndXJsJywgZGVzY3JpcHRpb246ICdXZWJzaXRlIFVSTCcgfV0sXG4gICdudXh0LXdlYic6IFt7IG5hbWU6ICd1cmwnLCBkZXNjcmlwdGlvbjogJ1dlYnNpdGUgVVJMJyB9XSxcbiAgJ3N2ZWx0ZWtpdC13ZWInOiBbeyBuYW1lOiAndXJsJywgZGVzY3JpcHRpb246ICdXZWJzaXRlIFVSTCcgfV0sXG4gICdzb2xpZHN0YXJ0LXdlYic6IFt7IG5hbWU6ICd1cmwnLCBkZXNjcmlwdGlvbjogJ1dlYnNpdGUgVVJMJyB9XSxcbiAgJ3RhbnN0YWNrLXdlYic6IFt7IG5hbWU6ICd1cmwnLCBkZXNjcmlwdGlvbjogJ1dlYnNpdGUgVVJMJyB9XSxcbiAgJ3JlbWl4LXdlYic6IFt7IG5hbWU6ICd1cmwnLCBkZXNjcmlwdGlvbjogJ1dlYnNpdGUgVVJMJyB9XSxcbiAgJ211bHRpLWNvbnRhaW5lci13b3JrbG9hZCc6IFt7IG5hbWU6ICdsb2dHcm91cEFybicsIGRlc2NyaXB0aW9uOiAnTG9nIGdyb3VwIEFSTicgfV0sXG4gICdzcXMtcXVldWUnOiBbXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdRdWV1ZSBBUk4nIH0sXG4gICAgeyBuYW1lOiAndXJsJywgZGVzY3JpcHRpb246ICdRdWV1ZSBVUkwnIH0sXG4gICAgeyBuYW1lOiAnbmFtZScsIGRlc2NyaXB0aW9uOiAnUXVldWUgbmFtZScgfVxuICBdLFxuICAnc25zLXRvcGljJzogW1xuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnVG9waWMgQVJOJyB9LFxuICAgIHsgbmFtZTogJ25hbWUnLCBkZXNjcmlwdGlvbjogJ1RvcGljIG5hbWUnIH1cbiAgXVxufTtcbiIsCiAgICAiaW1wb3J0IHR5cGUgeyBSZXNvdXJjZUNsYXNzTmFtZSB9IGZyb20gJy4vY2xhc3MtY29uZmlnJztcbmltcG9ydCB7IFJFU09VUkNFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTIH0gZnJvbSAnLi9jbGFzcy1jb25maWcnO1xuaW1wb3J0IHsgQmFzZVJlc291cmNlIH0gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHsgUkVGRVJFTkNFQUJMRV9QQVJBTVMgfSBmcm9tICcuL3Jlc291cmNlLW1ldGFkYXRhJztcblxuLy8gUHJpdmF0ZSBzeW1ib2wgZm9yIGFjY2Vzc2luZyB0aGUgaW50ZXJuYWwgcGFyYW0gcmVmZXJlbmNlIG1ldGhvZFxuY29uc3QgZ2V0UGFyYW1SZWZlcmVuY2VTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6Z2V0UGFyYW1SZWZlcmVuY2UnKTtcblxuLyoqXG4gKiBGYWN0b3J5IGZ1bmN0aW9uIHRvIGNyZWF0ZSBhIHJlc291cmNlIGNsYXNzIHdpdGggcmVmZXJlbmNlYWJsZSBwYXJhbWV0ZXJzLlxuICogU3VwcG9ydHMgdHdvIGNhbGxpbmcgY29udmVudGlvbnM6XG4gKiAtIG5ldyBSZXNvdXJjZShwcm9wZXJ0aWVzKSAtIG5hbWUgZGVyaXZlZCBmcm9tIG9iamVjdCBrZXkgaW4gcmVzb3VyY2VzXG4gKiAtIG5ldyBSZXNvdXJjZShuYW1lLCBwcm9wZXJ0aWVzKSAtIGV4cGxpY2l0IG5hbWUgKGJhY2t3YXJkcyBjb21wYXRpYmxlKVxuICovXG5mdW5jdGlvbiBjcmVhdGVSZXNvdXJjZUNsYXNzKGNsYXNzTmFtZTogUmVzb3VyY2VDbGFzc05hbWUsIHJlc291cmNlVHlwZTogc3RyaW5nKTogYW55IHtcbiAgLy8gQ3JlYXRlIHRoZSBjbGFzcyBkeW5hbWljYWxseVxuICBjb25zdCBSZXNvdXJjZUNsYXNzID0gY2xhc3MgZXh0ZW5kcyBCYXNlUmVzb3VyY2Uge1xuICAgIGNvbnN0cnVjdG9yKG5hbWVPclByb3BlcnRpZXM6IHN0cmluZyB8IGFueSwgcHJvcGVydGllcz86IGFueSkge1xuICAgICAgaWYgKHR5cGVvZiBuYW1lT3JQcm9wZXJ0aWVzID09PSAnc3RyaW5nJykge1xuICAgICAgICAvLyBPbGQgc3R5bGU6IChuYW1lLCBwcm9wZXJ0aWVzKSAtIGV4cGxpY2l0IG5hbWVcbiAgICAgICAgc3VwZXIobmFtZU9yUHJvcGVydGllcywgcmVzb3VyY2VUeXBlLCBwcm9wZXJ0aWVzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE5ldyBzdHlsZTogKHByb3BlcnRpZXMpIC0gbmFtZSB3aWxsIGJlIHNldCBmcm9tIG9iamVjdCBrZXlcbiAgICAgICAgc3VwZXIodW5kZWZpbmVkLCByZXNvdXJjZVR5cGUsIG5hbWVPclByb3BlcnRpZXMpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBTZXQgdGhlIGNsYXNzIG5hbWUgZm9yIGJldHRlciBkZWJ1Z2dpbmdcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFJlc291cmNlQ2xhc3MsICduYW1lJywgeyB2YWx1ZTogY2xhc3NOYW1lIH0pO1xuXG4gIC8vIEFkZCByZWZlcmVuY2VhYmxlIHBhcmFtZXRlciBnZXR0ZXJzXG4gIGNvbnN0IHJlZmVyZW5jZWFibGVQYXJhbXMgPSBSRUZFUkVOQ0VBQkxFX1BBUkFNU1tyZXNvdXJjZVR5cGVdIHx8IFtdO1xuICBmb3IgKGNvbnN0IHBhcmFtIG9mIHJlZmVyZW5jZWFibGVQYXJhbXMpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUmVzb3VyY2VDbGFzcy5wcm90b3R5cGUsIHBhcmFtLm5hbWUsIHtcbiAgICAgIGdldCh0aGlzOiBCYXNlUmVzb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGFzIGFueSlbZ2V0UGFyYW1SZWZlcmVuY2VTeW1ib2xdKHBhcmFtLm5hbWUpO1xuICAgICAgfSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gUmVzb3VyY2VDbGFzcztcbn1cblxuLy8gQ3JlYXRlIGFsbCByZXNvdXJjZSBjbGFzc2VzIGZyb20gY29uZmlnXG5jb25zdCBSRVNPVVJDRV9DTEFTU0VTOiBSZWNvcmQ8c3RyaW5nLCBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVSZXNvdXJjZUNsYXNzPj4gPSB7fTtcbmZvciAoY29uc3QgZGVmIG9mIFJFU09VUkNFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTKSB7XG4gIC8vIFVzZSAnTGFtYmRhRnVuY3Rpb24nIGFzIHRoZSBleHBvcnRlZCBuYW1lIGZvciAnRnVuY3Rpb24nIHRvIGF2b2lkIEpTIHJlc2VydmVkIHdvcmQgaXNzdWVzXG4gIFJFU09VUkNFX0NMQVNTRVNbZGVmLmNsYXNzTmFtZSBhcyBhbnldID0gY3JlYXRlUmVzb3VyY2VDbGFzcyhkZWYuY2xhc3NOYW1lLCBkZWYucmVzb3VyY2VUeXBlKTtcbn1cblxuLy8gRXhwb3J0IGFsbCByZXNvdXJjZSBjbGFzc2VzIGZvciBuYW1lZCBpbXBvcnRzXG5leHBvcnQgY29uc3Qge1xuICBSZWxhdGlvbmFsRGF0YWJhc2UsXG4gIFdlYlNlcnZpY2UsXG4gIFByaXZhdGVTZXJ2aWNlLFxuICBXb3JrZXJTZXJ2aWNlLFxuICBNdWx0aUNvbnRhaW5lcldvcmtsb2FkLFxuICBMYW1iZGFGdW5jdGlvbixcbiAgQmF0Y2hKb2IsXG4gIEJ1Y2tldCxcbiAgSG9zdGluZ0J1Y2tldCxcbiAgRHluYW1vRGJUYWJsZSxcbiAgRXZlbnRCdXMsXG4gIEh0dHBBcGlHYXRld2F5LFxuICBBcHBsaWNhdGlvbkxvYWRCYWxhbmNlcixcbiAgTmV0d29ya0xvYWRCYWxhbmNlcixcbiAgUmVkaXNDbHVzdGVyLFxuICBNb25nb0RiQXRsYXNDbHVzdGVyLFxuICBTdGF0ZU1hY2hpbmUsXG4gIFVzZXJBdXRoUG9vbCxcbiAgVXBzdGFzaFJlZGlzLFxuICBTcXNRdWV1ZSxcbiAgU25zVG9waWMsXG4gIEtpbmVzaXNTdHJlYW0sXG4gIFdlYkFwcEZpcmV3YWxsLFxuICBPcGVuU2VhcmNoRG9tYWluLFxuICBFZnNGaWxlc3lzdGVtLFxuICBOZXh0anNXZWIsXG4gIEJhc3Rpb25cbn0gPSBSRVNPVVJDRV9DTEFTU0VTO1xuIiwKICAgICJpbXBvcnQgeyBNSVNDX1RZUEVTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMgfSBmcm9tICcuL2NsYXNzLWNvbmZpZyc7XG5pbXBvcnQgeyBCYXNlVHlwZVByb3BlcnRpZXMsIEJhc2VUeXBlT25seSB9IGZyb20gJy4vY29uZmlnJztcblxuZnVuY3Rpb24gY3JlYXRlVHlwZVByb3BlcnRpZXNDbGFzcyhjbGFzc05hbWU6IHN0cmluZywgdHlwZVZhbHVlOiBzdHJpbmcsIHR5cGVPbmx5PzogYm9vbGVhbik6IGFueSB7XG4gIGlmICh0eXBlT25seSkge1xuICAgIGNvbnN0IFR5cGVPbmx5Q2xhc3MgPSBjbGFzcyBleHRlbmRzIEJhc2VUeXBlT25seSB7XG4gICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIodHlwZVZhbHVlKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShUeXBlT25seUNsYXNzLCAnbmFtZScsIHsgdmFsdWU6IGNsYXNzTmFtZSB9KTtcbiAgICByZXR1cm4gVHlwZU9ubHlDbGFzcztcbiAgfVxuXG4gIGNvbnN0IFR5cGVQcm9wZXJ0aWVzQ2xhc3MgPSBjbGFzcyBleHRlbmRzIEJhc2VUeXBlUHJvcGVydGllcyB7XG4gICAgY29uc3RydWN0b3IocHJvcGVydGllczogYW55KSB7XG4gICAgICBzdXBlcih0eXBlVmFsdWUsIHByb3BlcnRpZXMpO1xuICAgIH1cbiAgfTtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoVHlwZVByb3BlcnRpZXNDbGFzcywgJ25hbWUnLCB7IHZhbHVlOiBjbGFzc05hbWUgfSk7XG4gIHJldHVybiBUeXBlUHJvcGVydGllc0NsYXNzO1xufVxuXG4vLyBDcmVhdGUgYWxsIHR5cGUtcHJvcGVydGllcyBjbGFzc2VzIGZyb20gY29uZmlnXG5jb25zdCBUWVBFX1BST1BFUlRJRVNfQ0xBU1NFUzogUmVjb3JkPHN0cmluZywgUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlVHlwZVByb3BlcnRpZXNDbGFzcz4+ID0ge307XG5mb3IgKGNvbnN0IGRlZiBvZiBNSVNDX1RZUEVTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMpIHtcbiAgVFlQRV9QUk9QRVJUSUVTX0NMQVNTRVNbZGVmLmNsYXNzTmFtZV0gPSBjcmVhdGVUeXBlUHJvcGVydGllc0NsYXNzKGRlZi5jbGFzc05hbWUsIGRlZi50eXBlVmFsdWUsIGRlZi50eXBlT25seSk7XG59XG5cbi8vIEV4cG9ydCBhbGwgY2xhc3NlcyBmb3IgbmFtZWQgaW1wb3J0cyAoVHlwZVNjcmlwdCBuZWVkcyB0aGVzZSBleHBsaWNpdCBleHBvcnRzKVxuZXhwb3J0IGNvbnN0IHtcbiAgLy8gRGF0YWJhc2UgRW5naW5lc1xuICBSZHNFbmdpbmVQb3N0Z3JlcyxcbiAgUmRzRW5naW5lTWFyaWFkYixcbiAgUmRzRW5naW5lTXlzcWwsXG4gIFJkc0VuZ2luZU9yYWNsZUVFLFxuICBSZHNFbmdpbmVPcmFjbGVTRTIsXG4gIFJkc0VuZ2luZVNxbFNlcnZlckVFLFxuICBSZHNFbmdpbmVTcWxTZXJ2ZXJFWCxcbiAgUmRzRW5naW5lU3FsU2VydmVyU0UsXG4gIFJkc0VuZ2luZVNxbFNlcnZlcldlYixcbiAgQXVyb3JhRW5naW5lUG9zdGdyZXNxbCxcbiAgQXVyb3JhRW5naW5lTXlzcWwsXG4gIEF1cm9yYVNlcnZlcmxlc3NFbmdpbmVQb3N0Z3Jlc3FsLFxuICBBdXJvcmFTZXJ2ZXJsZXNzRW5naW5lTXlzcWwsXG4gIEF1cm9yYVNlcnZlcmxlc3NWMkVuZ2luZVBvc3RncmVzcWwsXG4gIEF1cm9yYVNlcnZlcmxlc3NWMkVuZ2luZU15c3FsLFxuICAvLyBMYW1iZGEgUGFja2FnaW5nXG4gIFN0YWNrdGFwZUxhbWJkYUJ1aWxkcGFja1BhY2thZ2luZyxcbiAgQ3VzdG9tQXJ0aWZhY3RMYW1iZGFQYWNrYWdpbmcsXG4gIC8vIENvbnRhaW5lciBQYWNrYWdpbmdcbiAgUHJlYnVpbHRJbWFnZVBhY2thZ2luZyxcbiAgQ3VzdG9tRG9ja2VyZmlsZVBhY2thZ2luZyxcbiAgRXh0ZXJuYWxCdWlsZHBhY2tQYWNrYWdpbmcsXG4gIE5peHBhY2tzUGFja2FnaW5nLFxuICBTdGFja3RhcGVJbWFnZUJ1aWxkcGFja1BhY2thZ2luZyxcbiAgLy8gTGFtYmRhIEZ1bmN0aW9uIEV2ZW50cy9JbnRlZ3JhdGlvbnNcbiAgSHR0cEFwaUludGVncmF0aW9uLFxuICBTM0ludGVncmF0aW9uLFxuICBTY2hlZHVsZUludGVncmF0aW9uLFxuICBTbnNJbnRlZ3JhdGlvbixcbiAgU3FzSW50ZWdyYXRpb24sXG4gIEtpbmVzaXNJbnRlZ3JhdGlvbixcbiAgRHluYW1vRGJJbnRlZ3JhdGlvbixcbiAgQ2xvdWR3YXRjaExvZ0ludGVncmF0aW9uLFxuICBBcHBsaWNhdGlvbkxvYWRCYWxhbmNlckludGVncmF0aW9uLFxuICBFdmVudEJ1c0ludGVncmF0aW9uLFxuICBLYWZrYVRvcGljSW50ZWdyYXRpb24sXG4gIEFsYXJtSW50ZWdyYXRpb24sXG4gIElvdEludGVncmF0aW9uLFxuICAvLyBDRE4gUm91dGVzXG4gIENkbkxvYWRCYWxhbmNlclJvdXRlLFxuICBDZG5IdHRwQXBpR2F0ZXdheVJvdXRlLFxuICBDZG5MYW1iZGFGdW5jdGlvblJvdXRlLFxuICBDZG5DdXN0b21Eb21haW5Sb3V0ZSxcbiAgQ2RuQnVja2V0Um91dGUsXG4gIC8vIFdlYiBBcHAgRmlyZXdhbGwgUnVsZXNcbiAgTWFuYWdlZFJ1bGVHcm91cCxcbiAgQ3VzdG9tUnVsZUdyb3VwLFxuICBSYXRlQmFzZWRSdWxlLFxuICAvLyBTUVMgUXVldWUgSW50ZWdyYXRpb25zXG4gIFNxc1F1ZXVlRXZlbnRCdXNJbnRlZ3JhdGlvbixcbiAgLy8gTXVsdGkgQ29udGFpbmVyIFdvcmtsb2FkIEludGVncmF0aW9uc1xuICBNdWx0aUNvbnRhaW5lcldvcmtsb2FkSHR0cEFwaUludGVncmF0aW9uLFxuICBNdWx0aUNvbnRhaW5lcldvcmtsb2FkTG9hZEJhbGFuY2VySW50ZWdyYXRpb24sXG4gIE11bHRpQ29udGFpbmVyV29ya2xvYWROZXR3b3JrTG9hZEJhbGFuY2VySW50ZWdyYXRpb24sXG4gIE11bHRpQ29udGFpbmVyV29ya2xvYWRJbnRlcm5hbEludGVncmF0aW9uLFxuICBNdWx0aUNvbnRhaW5lcldvcmtsb2FkU2VydmljZUNvbm5lY3RJbnRlZ3JhdGlvbixcbiAgLy8gU2NyaXB0c1xuICBMb2NhbFNjcmlwdCxcbiAgQmFzdGlvblNjcmlwdCxcbiAgTG9jYWxTY3JpcHRXaXRoQmFzdGlvblR1bm5lbGluZyxcbiAgLy8gTG9nIEZvcndhcmRpbmdcbiAgSHR0cEVuZHBvaW50TG9nRm9yd2FyZGluZyxcbiAgSGlnaGxpZ2h0TG9nRm9yd2FyZGluZyxcbiAgRGF0YWRvZ0xvZ0ZvcndhcmRpbmcsXG4gIC8vIEJ1Y2tldCBMaWZlY3ljbGUgUnVsZXNcbiAgRXhwaXJhdGlvbkxpZmVjeWNsZVJ1bGUsXG4gIE5vbkN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbkxpZmVjeWNsZVJ1bGUsXG4gIC8vIEVGUyBNb3VudHNcbiAgQ29udGFpbmVyRWZzTW91bnQsXG4gIExhbWJkYUVmc01vdW50LFxuICAvLyBBdXRob3JpemVyc1xuICBDb2duaXRvQXV0aG9yaXplcixcbiAgTGFtYmRhQXV0aG9yaXplcixcbiAgLy8gQWxhcm0gVHJpZ2dlcnNcbiAgQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJDdXN0b21UcmlnZ2VyLFxuICBBcHBsaWNhdGlvbkxvYWRCYWxhbmNlckVycm9yUmF0ZVRyaWdnZXIsXG4gIEFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyVW5oZWFsdGh5VGFyZ2V0c1RyaWdnZXIsXG4gIEh0dHBBcGlHYXRld2F5RXJyb3JSYXRlVHJpZ2dlcixcbiAgSHR0cEFwaUdhdGV3YXlMYXRlbmN5VHJpZ2dlcixcbiAgUmVsYXRpb25hbERhdGFiYXNlUmVhZExhdGVuY3lUcmlnZ2VyLFxuICBSZWxhdGlvbmFsRGF0YWJhc2VXcml0ZUxhdGVuY3lUcmlnZ2VyLFxuICBSZWxhdGlvbmFsRGF0YWJhc2VDUFVVdGlsaXphdGlvblRyaWdnZXIsXG4gIFJlbGF0aW9uYWxEYXRhYmFzZUZyZWVTdG9yYWdlVHJpZ2dlcixcbiAgUmVsYXRpb25hbERhdGFiYXNlRnJlZU1lbW9yeVRyaWdnZXIsXG4gIFJlbGF0aW9uYWxEYXRhYmFzZUNvbm5lY3Rpb25Db3VudFRyaWdnZXIsXG4gIFNxc1F1ZXVlUmVjZWl2ZWRNZXNzYWdlc0NvdW50VHJpZ2dlcixcbiAgU3FzUXVldWVOb3RFbXB0eVRyaWdnZXIsXG4gIExhbWJkYUVycm9yUmF0ZVRyaWdnZXIsXG4gIExhbWJkYUR1cmF0aW9uVHJpZ2dlcixcbiAgLy8gQ3VzdG9tIFJlc291cmNlc1xuICBDdXN0b21SZXNvdXJjZURlZmluaXRpb24sXG4gIEN1c3RvbVJlc291cmNlSW5zdGFuY2UsXG4gIC8vIERlcGxveW1lbnQgU2NyaXB0c1xuICBEZXBsb3ltZW50U2NyaXB0LFxuICAvLyBFZGdlIExhbWJkYSBGdW5jdGlvbnNcbiAgRWRnZUxhbWJkYUZ1bmN0aW9uXG59ID0gVFlQRV9QUk9QRVJUSUVTX0NMQVNTRVM7XG4iCiAgXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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O0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjLENBQUM7QUFBQSxFQUNqQjtBQUNGO0FBaUJPLElBQU0sb0NBQWdFO0FBQUEsRUFFM0U7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBRUE7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFB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QUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUVBO0FBQUEsRUFDQTtBQUFBLEVBRUE7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBRUE7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBRUE7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUVBO0FBQUEsRUFDQTtBQUFBLEVBRUE7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUVBO0FBQUEsRUFFQTtBQUFBLElBQ0U7IiwKICAiZGVidWdJZCI6ICJEQzMyODcwQTJBNjZGRDVFNjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
