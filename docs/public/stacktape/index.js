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

//# debugId=58DC20D060DAE3AA64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi5cXG5vZGVfbW9kdWxlc1xcY2hhbmdlLWNhc2VcXGRpc3RcXGluZGV4LmpzIiwgIi4uXFxzaGFyZWRcXG5hbWluZ1xcbG9naWNhbC1uYW1lcy50cyIsICIuLlxcc3JjXFxhcGlcXG5wbVxcdHNcXGNoaWxkLXJlc291cmNlcy50cyIsICIuLlxcc3JjXFxhcGlcXG5wbVxcdHNcXGNvbmZpZy50cyIsICIuLlxcc3JjXFxhcGlcXG5wbVxcdHNcXGRpcmVjdGl2ZXMudHMiLCAiLi5cXHNyY1xcYXBpXFxucG1cXHRzXFxnbG9iYWwtYXdzLXNlcnZpY2VzLnRzIiwgIi4uXFxzcmNcXGFwaVxcbnBtXFx0c1xcY2xhc3MtY29uZmlnLnRzIiwgIi4uXFxzcmNcXGFwaVxcbnBtXFx0c1xccmVzb3VyY2UtbWV0YWRhdGEudHMiLCAiLi5cXHNyY1xcYXBpXFxucG1cXHRzXFxyZXNvdXJjZXMudHMiLCAiLi5cXHNyY1xcYXBpXFxucG1cXHRzXFx0eXBlLXByb3BlcnRpZXMudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiLy8gUmVnZXhwcyBpbnZvbHZlZCB3aXRoIHNwbGl0dGluZyB3b3JkcyBpbiB2YXJpb3VzIGNhc2UgZm9ybWF0cy5cbmNvbnN0IFNQTElUX0xPV0VSX1VQUEVSX1JFID0gLyhbXFxwe0xsfVxcZF0pKFxccHtMdX0pL2d1O1xuY29uc3QgU1BMSVRfVVBQRVJfVVBQRVJfUkUgPSAvKFxccHtMdX0pKFtcXHB7THV9XVtcXHB7TGx9XSkvZ3U7XG4vLyBVc2VkIHRvIGl0ZXJhdGUgb3ZlciB0aGUgaW5pdGlhbCBzcGxpdCByZXN1bHQgYW5kIHNlcGFyYXRlIG51bWJlcnMuXG5jb25zdCBTUExJVF9TRVBBUkFURV9OVU1CRVJfUkUgPSAvKFxcZClcXHB7TGx9fChcXHB7TH0pXFxkL3U7XG4vLyBSZWdleHAgaW52b2x2ZWQgd2l0aCBzdHJpcHBpbmcgbm9uLXdvcmQgY2hhcmFjdGVycyBmcm9tIHRoZSByZXN1bHQuXG5jb25zdCBERUZBVUxUX1NUUklQX1JFR0VYUCA9IC9bXlxccHtMfVxcZF0rL2dpdTtcbi8vIFRoZSByZXBsYWNlbWVudCB2YWx1ZSBmb3Igc3BsaXRzLlxuY29uc3QgU1BMSVRfUkVQTEFDRV9WQUxVRSA9IFwiJDFcXDAkMlwiO1xuLy8gVGhlIGRlZmF1bHQgY2hhcmFjdGVycyB0byBrZWVwIGFmdGVyIHRyYW5zZm9ybWluZyBjYXNlLlxuY29uc3QgREVGQVVMVF9QUkVGSVhfU1VGRklYX0NIQVJBQ1RFUlMgPSBcIlwiO1xuLyoqXG4gKiBTcGxpdCBhbnkgY2FzZWQgaW5wdXQgc3RyaW5ncyBpbnRvIGFuIGFycmF5IG9mIHdvcmRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3BsaXQodmFsdWUpIHtcbiAgICBsZXQgcmVzdWx0ID0gdmFsdWUudHJpbSgpO1xuICAgIHJlc3VsdCA9IHJlc3VsdFxuICAgICAgICAucmVwbGFjZShTUExJVF9MT1dFUl9VUFBFUl9SRSwgU1BMSVRfUkVQTEFDRV9WQUxVRSlcbiAgICAgICAgLnJlcGxhY2UoU1BMSVRfVVBQRVJfVVBQRVJfUkUsIFNQTElUX1JFUExBQ0VfVkFMVUUpO1xuICAgIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKERFRkFVTFRfU1RSSVBfUkVHRVhQLCBcIlxcMFwiKTtcbiAgICBsZXQgc3RhcnQgPSAwO1xuICAgIGxldCBlbmQgPSByZXN1bHQubGVuZ3RoO1xuICAgIC8vIFRyaW0gdGhlIGRlbGltaXRlciBmcm9tIGFyb3VuZCB0aGUgb3V0cHV0IHN0cmluZy5cbiAgICB3aGlsZSAocmVzdWx0LmNoYXJBdChzdGFydCkgPT09IFwiXFwwXCIpXG4gICAgICAgIHN0YXJ0Kys7XG4gICAgaWYgKHN0YXJ0ID09PSBlbmQpXG4gICAgICAgIHJldHVybiBbXTtcbiAgICB3aGlsZSAocmVzdWx0LmNoYXJBdChlbmQgLSAxKSA9PT0gXCJcXDBcIilcbiAgICAgICAgZW5kLS07XG4gICAgcmV0dXJuIHJlc3VsdC5zbGljZShzdGFydCwgZW5kKS5zcGxpdCgvXFwwL2cpO1xufVxuLyoqXG4gKiBTcGxpdCB0aGUgaW5wdXQgc3RyaW5nIGludG8gYW4gYXJyYXkgb2Ygd29yZHMsIHNlcGFyYXRpbmcgbnVtYmVycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNwbGl0U2VwYXJhdGVOdW1iZXJzKHZhbHVlKSB7XG4gICAgY29uc3Qgd29yZHMgPSBzcGxpdCh2YWx1ZSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB3b3JkID0gd29yZHNbaV07XG4gICAgICAgIGNvbnN0IG1hdGNoID0gU1BMSVRfU0VQQVJBVEVfTlVNQkVSX1JFLmV4ZWMod29yZCk7XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gbWF0Y2guaW5kZXggKyAobWF0Y2hbMV0gPz8gbWF0Y2hbMl0pLmxlbmd0aDtcbiAgICAgICAgICAgIHdvcmRzLnNwbGljZShpLCAxLCB3b3JkLnNsaWNlKDAsIG9mZnNldCksIHdvcmQuc2xpY2Uob2Zmc2V0KSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHdvcmRzO1xufVxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIHRvIHNwYWNlIHNlcGFyYXRlZCBsb3dlciBjYXNlIChgZm9vIGJhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9DYXNlKGlucHV0LCBvcHRpb25zKSB7XG4gICAgY29uc3QgW3ByZWZpeCwgd29yZHMsIHN1ZmZpeF0gPSBzcGxpdFByZWZpeFN1ZmZpeChpbnB1dCwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIChwcmVmaXggK1xuICAgICAgICB3b3Jkcy5tYXAobG93ZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSkpLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiIFwiKSArXG4gICAgICAgIHN1ZmZpeCk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8gY2FtZWwgY2FzZSAoYGZvb0JhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FtZWxDYXNlKGlucHV0LCBvcHRpb25zKSB7XG4gICAgY29uc3QgW3ByZWZpeCwgd29yZHMsIHN1ZmZpeF0gPSBzcGxpdFByZWZpeFN1ZmZpeChpbnB1dCwgb3B0aW9ucyk7XG4gICAgY29uc3QgbG93ZXIgPSBsb3dlckZhY3Rvcnkob3B0aW9ucz8ubG9jYWxlKTtcbiAgICBjb25zdCB1cHBlciA9IHVwcGVyRmFjdG9yeShvcHRpb25zPy5sb2NhbGUpO1xuICAgIGNvbnN0IHRyYW5zZm9ybSA9IG9wdGlvbnM/Lm1lcmdlQW1iaWd1b3VzQ2hhcmFjdGVyc1xuICAgICAgICA/IGNhcGl0YWxDYXNlVHJhbnNmb3JtRmFjdG9yeShsb3dlciwgdXBwZXIpXG4gICAgICAgIDogcGFzY2FsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKTtcbiAgICByZXR1cm4gKHByZWZpeCArXG4gICAgICAgIHdvcmRzXG4gICAgICAgICAgICAubWFwKCh3b3JkLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBsb3dlcih3b3JkKTtcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm0od29yZCwgaW5kZXgpO1xuICAgICAgICB9KVxuICAgICAgICAgICAgLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiXCIpICtcbiAgICAgICAgc3VmZml4KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBwYXNjYWwgY2FzZSAoYEZvb0JhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFzY2FsQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIGNvbnN0IFtwcmVmaXgsIHdvcmRzLCBzdWZmaXhdID0gc3BsaXRQcmVmaXhTdWZmaXgoaW5wdXQsIG9wdGlvbnMpO1xuICAgIGNvbnN0IGxvd2VyID0gbG93ZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSk7XG4gICAgY29uc3QgdXBwZXIgPSB1cHBlckZhY3Rvcnkob3B0aW9ucz8ubG9jYWxlKTtcbiAgICBjb25zdCB0cmFuc2Zvcm0gPSBvcHRpb25zPy5tZXJnZUFtYmlndW91c0NoYXJhY3RlcnNcbiAgICAgICAgPyBjYXBpdGFsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKVxuICAgICAgICA6IHBhc2NhbENhc2VUcmFuc2Zvcm1GYWN0b3J5KGxvd2VyLCB1cHBlcik7XG4gICAgcmV0dXJuIHByZWZpeCArIHdvcmRzLm1hcCh0cmFuc2Zvcm0pLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiXCIpICsgc3VmZml4O1xufVxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIHRvIHBhc2NhbCBzbmFrZSBjYXNlIChgRm9vX0JhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFzY2FsU25ha2VDYXNlKGlucHV0LCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGNhcGl0YWxDYXNlKGlucHV0LCB7IGRlbGltaXRlcjogXCJfXCIsIC4uLm9wdGlvbnMgfSk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8gY2FwaXRhbCBjYXNlIChgRm9vIEJhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FwaXRhbENhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBbcHJlZml4LCB3b3Jkcywgc3VmZml4XSA9IHNwbGl0UHJlZml4U3VmZml4KGlucHV0LCBvcHRpb25zKTtcbiAgICBjb25zdCBsb3dlciA9IGxvd2VyRmFjdG9yeShvcHRpb25zPy5sb2NhbGUpO1xuICAgIGNvbnN0IHVwcGVyID0gdXBwZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSk7XG4gICAgcmV0dXJuIChwcmVmaXggK1xuICAgICAgICB3b3Jkc1xuICAgICAgICAgICAgLm1hcChjYXBpdGFsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKSlcbiAgICAgICAgICAgIC5qb2luKG9wdGlvbnM/LmRlbGltaXRlciA/PyBcIiBcIikgK1xuICAgICAgICBzdWZmaXgpO1xufVxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIHRvIGNvbnN0YW50IGNhc2UgKGBGT09fQkFSYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25zdGFudENhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBbcHJlZml4LCB3b3Jkcywgc3VmZml4XSA9IHNwbGl0UHJlZml4U3VmZml4KGlucHV0LCBvcHRpb25zKTtcbiAgICByZXR1cm4gKHByZWZpeCArXG4gICAgICAgIHdvcmRzLm1hcCh1cHBlckZhY3Rvcnkob3B0aW9ucz8ubG9jYWxlKSkuam9pbihvcHRpb25zPy5kZWxpbWl0ZXIgPz8gXCJfXCIpICtcbiAgICAgICAgc3VmZml4KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBkb3QgY2FzZSAoYGZvby5iYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRvdENhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbm9DYXNlKGlucHV0LCB7IGRlbGltaXRlcjogXCIuXCIsIC4uLm9wdGlvbnMgfSk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8ga2ViYWIgY2FzZSAoYGZvby1iYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGtlYmFiQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBub0Nhc2UoaW5wdXQsIHsgZGVsaW1pdGVyOiBcIi1cIiwgLi4ub3B0aW9ucyB9KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBwYXRoIGNhc2UgKGBmb28vYmFyYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXRoQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBub0Nhc2UoaW5wdXQsIHsgZGVsaW1pdGVyOiBcIi9cIiwgLi4ub3B0aW9ucyB9KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBwYXRoIGNhc2UgKGBGb28gYmFyYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZW50ZW5jZUNhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBbcHJlZml4LCB3b3Jkcywgc3VmZml4XSA9IHNwbGl0UHJlZml4U3VmZml4KGlucHV0LCBvcHRpb25zKTtcbiAgICBjb25zdCBsb3dlciA9IGxvd2VyRmFjdG9yeShvcHRpb25zPy5sb2NhbGUpO1xuICAgIGNvbnN0IHVwcGVyID0gdXBwZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSk7XG4gICAgY29uc3QgdHJhbnNmb3JtID0gY2FwaXRhbENhc2VUcmFuc2Zvcm1GYWN0b3J5KGxvd2VyLCB1cHBlcik7XG4gICAgcmV0dXJuIChwcmVmaXggK1xuICAgICAgICB3b3Jkc1xuICAgICAgICAgICAgLm1hcCgod29yZCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNmb3JtKHdvcmQpO1xuICAgICAgICAgICAgcmV0dXJuIGxvd2VyKHdvcmQpO1xuICAgICAgICB9KVxuICAgICAgICAgICAgLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiIFwiKSArXG4gICAgICAgIHN1ZmZpeCk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8gc25ha2UgY2FzZSAoYGZvb19iYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNuYWtlQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBub0Nhc2UoaW5wdXQsIHsgZGVsaW1pdGVyOiBcIl9cIiwgLi4ub3B0aW9ucyB9KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBoZWFkZXIgY2FzZSAoYEZvby1CYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYWluQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBjYXBpdGFsQ2FzZShpbnB1dCwgeyBkZWxpbWl0ZXI6IFwiLVwiLCAuLi5vcHRpb25zIH0pO1xufVxuZnVuY3Rpb24gbG93ZXJGYWN0b3J5KGxvY2FsZSkge1xuICAgIHJldHVybiBsb2NhbGUgPT09IGZhbHNlXG4gICAgICAgID8gKGlucHV0KSA9PiBpbnB1dC50b0xvd2VyQ2FzZSgpXG4gICAgICAgIDogKGlucHV0KSA9PiBpbnB1dC50b0xvY2FsZUxvd2VyQ2FzZShsb2NhbGUpO1xufVxuZnVuY3Rpb24gdXBwZXJGYWN0b3J5KGxvY2FsZSkge1xuICAgIHJldHVybiBsb2NhbGUgPT09IGZhbHNlXG4gICAgICAgID8gKGlucHV0KSA9PiBpbnB1dC50b1VwcGVyQ2FzZSgpXG4gICAgICAgIDogKGlucHV0KSA9PiBpbnB1dC50b0xvY2FsZVVwcGVyQ2FzZShsb2NhbGUpO1xufVxuZnVuY3Rpb24gY2FwaXRhbENhc2VUcmFuc2Zvcm1GYWN0b3J5KGxvd2VyLCB1cHBlcikge1xuICAgIHJldHVybiAod29yZCkgPT4gYCR7dXBwZXIod29yZFswXSl9JHtsb3dlcih3b3JkLnNsaWNlKDEpKX1gO1xufVxuZnVuY3Rpb24gcGFzY2FsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKSB7XG4gICAgcmV0dXJuICh3b3JkLCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBjaGFyMCA9IHdvcmRbMF07XG4gICAgICAgIGNvbnN0IGluaXRpYWwgPSBpbmRleCA+IDAgJiYgY2hhcjAgPj0gXCIwXCIgJiYgY2hhcjAgPD0gXCI5XCIgPyBcIl9cIiArIGNoYXIwIDogdXBwZXIoY2hhcjApO1xuICAgICAgICByZXR1cm4gaW5pdGlhbCArIGxvd2VyKHdvcmQuc2xpY2UoMSkpO1xuICAgIH07XG59XG5mdW5jdGlvbiBzcGxpdFByZWZpeFN1ZmZpeChpbnB1dCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgc3BsaXRGbiA9IG9wdGlvbnMuc3BsaXQgPz8gKG9wdGlvbnMuc2VwYXJhdGVOdW1iZXJzID8gc3BsaXRTZXBhcmF0ZU51bWJlcnMgOiBzcGxpdCk7XG4gICAgY29uc3QgcHJlZml4Q2hhcmFjdGVycyA9IG9wdGlvbnMucHJlZml4Q2hhcmFjdGVycyA/PyBERUZBVUxUX1BSRUZJWF9TVUZGSVhfQ0hBUkFDVEVSUztcbiAgICBjb25zdCBzdWZmaXhDaGFyYWN0ZXJzID0gb3B0aW9ucy5zdWZmaXhDaGFyYWN0ZXJzID8/IERFRkFVTFRfUFJFRklYX1NVRkZJWF9DSEFSQUNURVJTO1xuICAgIGxldCBwcmVmaXhJbmRleCA9IDA7XG4gICAgbGV0IHN1ZmZpeEluZGV4ID0gaW5wdXQubGVuZ3RoO1xuICAgIHdoaWxlIChwcmVmaXhJbmRleCA8IGlucHV0Lmxlbmd0aCkge1xuICAgICAgICBjb25zdCBjaGFyID0gaW5wdXQuY2hhckF0KHByZWZpeEluZGV4KTtcbiAgICAgICAgaWYgKCFwcmVmaXhDaGFyYWN0ZXJzLmluY2x1ZGVzKGNoYXIpKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIHByZWZpeEluZGV4Kys7XG4gICAgfVxuICAgIHdoaWxlIChzdWZmaXhJbmRleCA+IHByZWZpeEluZGV4KSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gc3VmZml4SW5kZXggLSAxO1xuICAgICAgICBjb25zdCBjaGFyID0gaW5wdXQuY2hhckF0KGluZGV4KTtcbiAgICAgICAgaWYgKCFzdWZmaXhDaGFyYWN0ZXJzLmluY2x1ZGVzKGNoYXIpKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIHN1ZmZpeEluZGV4ID0gaW5kZXg7XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICAgIGlucHV0LnNsaWNlKDAsIHByZWZpeEluZGV4KSxcbiAgICAgICAgc3BsaXRGbihpbnB1dC5zbGljZShwcmVmaXhJbmRleCwgc3VmZml4SW5kZXgpKSxcbiAgICAgICAgaW5wdXQuc2xpY2Uoc3VmZml4SW5kZXgpLFxuICAgIF07XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLAogICAgImltcG9ydCB0eXBlIHsgQ2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGUgfSBmcm9tICdAY2xvdWRmb3JtL3Jlc291cmNlLXR5cGVzJztcbmltcG9ydCB7IHBhc2NhbENhc2UgfSBmcm9tICdjaGFuZ2UtY2FzZSc7XG5cbmV4cG9ydCBjb25zdCBjZkxvZ2ljYWxOYW1lcyA9IHtcbiAgYnVja2V0KHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhc2NhbENhc2UoYCR7c3RwUmVzb3VyY2VOYW1lfS1idWNrZXRgKTtcbiAgfSxcbiAgYXRsYXNNb25nb1Byb2plY3QoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0F0bGFzTW9uZ28nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpQcm9qZWN0JyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29DcmVkZW50aWFsc1Byb3ZpZGVyKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBdGxhc01vbmdvQ3JlZGVudGlhbHNQcm92aWRlcicgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29Qcm9qZWN0VnBjTmV0d29ya0NvbnRhaW5lcigpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQXRsYXNNb25nbycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ01vbmdvREI6OlN0cEF0bGFzVjE6Ok5ldHdvcmtDb250YWluZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgYXRsYXNNb25nb1Byb2plY3RWcGNOZXR3b3JrUGVlcmluZygpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQXRsYXNNb25nbycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ01vbmdvREI6OlN0cEF0bGFzVjE6Ok5ldHdvcmtQZWVyaW5nJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29Qcm9qZWN0SXBBY2Nlc3NMaXN0KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBdGxhc01vbmdvJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6UHJvamVjdElwQWNjZXNzTGlzdCcgfVxuICAgIH0pO1xuICB9LFxuICBhdGxhc01vbmdvVXNlckFzc29jaWF0ZWRXaXRoUm9sZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBdGxhc01vbmdvJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6RGF0YWJhc2VVc2VyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29DbHVzdGVyTWFzdGVyVXNlcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6RGF0YWJhc2VVc2VyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29DbHVzdGVyKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpDbHVzdGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzUmVwbGljYXRpb25Hcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGlDYWNoZTo6UmVwbGljYXRpb25Hcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICByZWRpc0xvZ0dyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzUGFyYW1ldGVyR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpQ2FjaGU6OlBhcmFtZXRlckdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzU3VibmV0R3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpQ2FjaGU6OlN1Ym5ldEdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWZzRmlsZXN5c3RlbShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7XG4gICAgICAgIGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFRlM6OkZpbGVTeXN0ZW0nXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGVmc0FjY2Vzc1BvaW50KHtcbiAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgZWZzRmlsZXN5c3RlbU5hbWUsXG4gICAgcm9vdERpcmVjdG9yeVxuICB9OiB7XG4gICAgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmc7XG4gICAgZWZzRmlsZXN5c3RlbU5hbWU6IHN0cmluZztcbiAgICByb290RGlyZWN0b3J5Pzogc3RyaW5nO1xuICB9KSB7XG4gICAgLy8gQ3JlYXRlIGEgdW5pcXVlIGlkZW50aWZpZXIgYmFzZWQgb24gdGhlIHJvb3QgZGlyZWN0b3J5XG4gICAgY29uc3Qgcm9vdERpcklkZW50aWZpZXIgPSByb290RGlyZWN0b3J5ID8gYCR7cm9vdERpcmVjdG9yeS5yZXBsYWNlKC9cXC8vZywgJy0nKS5yZXBsYWNlKC9eLXwtJC9nLCAnJyl9YCA6ICdSb290JztcblxuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6IGAke2Vmc0ZpbGVzeXN0ZW1OYW1lfS0ke3Jvb3REaXJJZGVudGlmaWVyfWBcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHtcbiAgICAgICAgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6QWNjZXNzUG9pbnQnXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGVmc01vdW50VGFyZ2V0KHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBtb3VudFRhcmdldEluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU3VibmV0JywgdHlwZUluZGV4OiBtb3VudFRhcmdldEluZGV4IH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6TW91bnRUYXJnZXQnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWZzU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgc25zUm9sZVNlbmRTbXNGcm9tQ29nbml0byhzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdTZW5kU21zJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgY2xvdWRmcm9udERpc3RyaWJ1dGlvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZGlzdHJpYnV0aW9uSW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdDRE4nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsIGluZGV4OiBkaXN0cmlidXRpb25JbmRleCB9XG4gICAgfSk7XG4gIH0sXG4gIGNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgY2FjaGluZ09wdGlvbnNIYXNoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgQ0ROQ2FjaGVCZWhhdmlvciR7Y2FjaGluZ09wdGlvbnNIYXNofWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knIH1cbiAgICB9KTtcbiAgfSxcbiAgY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSh0eXBlOiAnRGVmRHluYW1pYycgfCAnRGVmU3RhdGljJykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGBDRE4ke3R5cGV9YCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBjbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZm9yd2FyZGluZ09wdGlvbnNIYXNoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgQ0ROQ2FjaGVCZWhhdmlvciR7Zm9yd2FyZGluZ09wdGlvbnNIYXNofWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBjbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3kodHlwZTogJ0RlZkR5bmFtaWMnIHwgJ0RlZlN0YXRpYycpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgQ0ROJHt0eXBlfWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBjbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHkoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQ0ROJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknIH1cbiAgICB9KTtcbiAgfSxcbiAgb3Blbk5leHRIb3N0SGVhZGVyUmV3cml0ZUZ1bmN0aW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ09wZW5OZXh0SG9zdEhlYWRlclJld3JpdGUnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkZ1bmN0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIHNzcldlYkhvc3RIZWFkZXJSZXdyaXRlRnVuY3Rpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIHJlc291cmNlVHlwZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYCR7cmVzb3VyY2VUeXBlLnJlcGxhY2UoLy0vZywgJycpfUhvc3RIZWFkZXJSZXdyaXRlYCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpGdW5jdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBvcGVuTmV4dEFzc2V0UmVwbGFjZXJDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBc3NldFJlcGxhY2VyJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgb3Blbk5leHREeW5hbW9JbnNlcnRDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdEeW5hbW9JbnNlcnQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBkbnNSZWNvcmQoZnVsbHlRdWFsaWZpZWREb21haW5OYW1lOiBzdHJpbmcpIHtcbiAgICAvLyB3ZSBkbyBub3QgYnVpbGQgYnVpbGQgdGhlIHJlc291cmNlIG5hbWUgY29udmVudGlvbmFsbHkgdGhyb3VnaCBzdHBSZXNvdXJjZU5hbWVcbiAgICAvLyB0aGlzIGlzIGR1ZSB0byB1cGRhdGUgYmVoYXZpb3JzIG9mIENsb3VkZm9ybWF0aW9uXG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6ICcnLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGdldFNwZWNpZmllckZvckRvbWFpblJlc291cmNlKGZ1bGx5UXVhbGlmaWVkRG9tYWluTmFtZSkgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JyB9XG4gICAgfSk7XG4gIH0sXG4gIGR5bmFtb0dsb2JhbFRhYmxlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkR5bmFtb0RCOjpHbG9iYWxUYWJsZScgfVxuICAgIH0pO1xuICB9LFxuICBkeW5hbW9SZWdpb25hbFRhYmxlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkR5bmFtb0RCOjpUYWJsZScgfVxuICAgIH0pO1xuICB9LFxuICBidWNrZXRQb2xpY3koc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBldmVudE9uRGVsaXZlcnlGYWlsdXJlU3FzUXVldWVQb2xpY3koc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZVBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBzbnNFdmVudFN1YnNjcmlwdGlvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0V2ZW50JyxcbiAgICAgICAgdHlwZUluZGV4OiBldmVudEluZGV4XG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTTlM6OlN1YnNjcmlwdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBzbnNFdmVudFBlcm1pc3Npb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjclJlcG8oKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0NvbnRhaW5lcidcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDUjo6UmVwb3NpdG9yeScgfVxuICAgIH0pO1xuICB9LFxuICBkZXBsb3ltZW50QnVja2V0KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdEZXBsb3ltZW50J1xuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfVxuICAgIH0pO1xuICB9LFxuICBkZXBsb3ltZW50QnVja2V0UG9saWN5KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdEZXBsb3ltZW50J1xuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFJbnZva2VDb25maWcoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpFdmVudEludm9rZUNvbmZpZycgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFWZXJzaW9uUHVibGlzaGVyQ3VzdG9tUmVzb3VyY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnVmVyc2lvbicgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGNvZGVEZXBsb3lTZXJ2aWNlUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnQ29kZURlcGxveSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaEluc3RhbmNlUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnQmF0Y2hJbnN0YW5jZSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaEluc3RhbmNlRGVmYXVsdFNlY3VyaXR5R3JvdXAoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0JhdGNoSW5zdGFuY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hJbnN0YW5jZVByb2ZpbGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0JhdGNoSW5zdGFuY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaEluc3RhbmNlTGF1bmNoVGVtcGxhdGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0JhdGNoSW5zdGFuY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkxhdW5jaFRlbXBsYXRlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhdGNoU3RhdGVNYWNoaW5lRXhlY3V0aW9uUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnQmF0Y2hTdGF0ZU1hY2hpbmUnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hTcG90RmxlZXRSb2xlKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdCYXRjaFNwb3RGbGVldCdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaFNlcnZpY2VSb2xlKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdCYXRjaFNlcnZpY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hKb2JFeGVjdXRpb25Sb2xlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaENvbXB1dGVFbnZpcm9ubWVudChzcG90OiBib29sZWFuLCBncHU6IGJvb2xlYW4pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiBgQmF0Y2gtJHtzcG90ID8gJ3Nwb3QnIDogJ29uRGVtYW5kJ30tJHtncHUgPyAnZ3B1JyA6ICcnfWBcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkJhdGNoOjpDb21wdXRlRW52aXJvbm1lbnQnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hKb2JRdWV1ZShzcG90OiBib29sZWFuLCBncHU6IGJvb2xlYW4pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiBgQmF0Y2gtJHtzcG90ID8gJ3Nwb3QnIDogJ29uRGVtYW5kJ30tJHtncHUgPyAnZ3B1JyA6ICcnfWBcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkJhdGNoOjpKb2JRdWV1ZScgfVxuICAgIH0pO1xuICB9LFxuICBzdWJuZXQocHVibGljU3VibmV0OiBib29sZWFuLCBzdWJuZXRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogcHVibGljU3VibmV0ID8gJ1B1YmxpYycgOiAnUHJpdmF0ZSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U3VibmV0JywgaW5kZXg6IHN1Ym5ldEluZGV4IH1cbiAgICB9KTtcbiAgfSxcbiAgdnBjKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlZQQycgfVxuICAgIH0pO1xuICB9LFxuICB2cGNHYXRld2F5RW5kcG9pbnQodHlwZTogJ3MzJyB8ICdkeW5hbW8tZGInKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYCR7dHlwZX0tR2F0ZXdheWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpWUENFbmRwb2ludCcgfVxuICAgIH0pO1xuICB9LFxuICBkYlN1Ym5ldEdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJTdWJuZXRHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBhdXJvcmFEYkNsdXN0ZXIoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQkNsdXN0ZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgYXVyb3JhRGJDbHVzdGVyUGFyYW1ldGVyR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQkNsdXN0ZXJQYXJhbWV0ZXJHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBhdXJvcmFEYkNsdXN0ZXJMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgbG9nR3JvdXBUeXBlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQ2x1c3RlcicsIHN1YnR5cGU6IGxvZ0dyb3VwVHlwZSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBkYlNlY3VyaXR5R3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGRiSW5zdGFuY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQkluc3RhbmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGRiSW5zdGFuY2VMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgbG9nR3JvdXBUeXBlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnSW5zdGFuY2UnLCBzdWJ0eXBlOiBsb2dHcm91cFR5cGUgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgb3BlblNlYXJjaERvbWFpbkxvZ0dyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBsb2dHcm91cFR5cGU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdJbnN0YW5jZScsIHN1YnR5cGU6IGxvZ0dyb3VwVHlwZSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBkYk9wdGlvbkdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6T3B0aW9uR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZGJJbnN0YW5jZVBhcmFtZXRlckdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJQYXJhbWV0ZXJHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBkYlJlcGxpY2Eoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIHJlcGxpY2FOdW06IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdSZXBsaWNhJywgdHlwZUluZGV4OiByZXBsaWNhTnVtIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJJbnN0YW5jZScgfVxuICAgIH0pO1xuICB9LFxuICBkYlJlcGxpY2FMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgbG9nR3JvdXBUeXBlOiBzdHJpbmcsIHJlcGxpY2FOdW06IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdSZXBsaWNhJywgdHlwZUluZGV4OiByZXBsaWNhTnVtLCBzdWJ0eXBlOiBsb2dHcm91cFR5cGUgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZGJSZXBsaWNhUGFyYW1ldGVyR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIHJlcGxpY2FOdW06IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdSZXBsaWNhJywgdHlwZUluZGV4OiByZXBsaWNhTnVtIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJQYXJhbWV0ZXJHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBhdXJvcmFEYkluc3RhbmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBpbnN0YW5jZU51bTogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJJbnN0YW5jZScsIGluZGV4OiBpbnN0YW5jZU51bSB9XG4gICAgfSk7XG4gIH0sXG4gIGF1cm9yYURiSW5zdGFuY2VQYXJhbWV0ZXJHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdJbnN0YW5jZScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQlBhcmFtZXRlckdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGV2ZW50QnVzUnVsZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0V2ZW50JyxcbiAgICAgICAgdHlwZUluZGV4OiBldmVudEluZGV4XG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFdmVudHM6OlJ1bGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgY3VzdG9tVGFnZ2luZ1NjaGVkdWxlUnVsZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU3RwQ3VzdG9tVGFnZ2luZ1NjaGVkdWxlJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFdmVudHM6OlJ1bGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgY3VzdG9tVGFnZ2luZ1NjaGVkdWxlUnVsZVBlcm1pc3Npb24oKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1N0cEN1c3RvbVRhZ2dpbmdTY2hlZHVsZVJ1bGUnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicgfVxuICAgIH0pO1xuICB9LFxuICBjbG91ZFdhdGNoTG9nRXZlbnRTdWJzY3JpcHRpb25GaWx0ZXIoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6U3Vic2NyaXB0aW9uRmlsdGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGV2ZW50U291cmNlTWFwcGluZyhzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0V2ZW50JyxcbiAgICAgICAgdHlwZUluZGV4OiBldmVudEluZGV4XG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkV2ZW50U291cmNlTWFwcGluZycgfVxuICAgIH0pO1xuICB9LFxuICBpb3RFdmVudFRvcGljUnVsZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0V2ZW50JyxcbiAgICAgICAgdHlwZUluZGV4OiBldmVudEluZGV4XG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJb1Q6OlRvcGljUnVsZScgfVxuICAgIH0pO1xuICB9LFxuICBraW5lc2lzRXZlbnRDb25zdW1lcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0V2ZW50JyxcbiAgICAgICAgdHlwZUluZGV4OiBldmVudEluZGV4XG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpLaW5lc2lzOjpTdHJlYW1Db25zdW1lcicgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGEoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGlzU3RwU2VydmljZUZ1bmN0aW9uPzogYm9vbGVhbikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiBpc1N0cFNlcnZpY2VGdW5jdGlvbiA/IHsgdHlwZTogJ0N1c3RvbVJlc291cmNlJyB9IDogdW5kZWZpbmVkLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxhbWJkYVN0cEFsaWFzKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ1N0cCdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6QWxpYXMnIH1cbiAgICB9KTtcbiAgfSxcbiAgbGFtYmRhVXJsKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6VXJsJyB9XG4gICAgfSk7XG4gIH0sXG4gIGNvZGVEZXBsb3lEZXBsb3ltZW50R3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6RGVwbG95bWVudEdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVJlc291cmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBzY3JpcHRDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdTY3JpcHQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaFN0YXRlTWFjaGluZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdKb2JFeGVjdXRpb24nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaEpvYkRlZmluaXRpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QmF0Y2g6OkpvYkRlZmluaXRpb24nIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hKb2JMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBnbG9iYWxTdGF0ZU1hY2hpbmVzUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnR2xvYmFsU3RhdGVNYWNoaW5lJ1xuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9XG4gICAgfSk7XG4gIH0sXG4gIHN0YXRlTWFjaGluZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnIH1cbiAgICB9KTtcbiAgfSxcbiAgaW50ZXJuZXRHYXRld2F5KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkludGVybmV0R2F0ZXdheScgfVxuICAgIH0pO1xuICB9LFxuICB2cGNHYXRld2F5QXR0YWNobWVudCgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpWUENHYXRld2F5QXR0YWNobWVudCcgfVxuICAgIH0pO1xuICB9LFxuICByb3V0ZVRhYmxlKHB1YmxpY1N1Ym5ldDogYm9vbGVhbiwgc3VibmV0SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IHB1YmxpY1N1Ym5ldCA/ICdQdWJsaWNTdWJuZXQnIDogJ1ByaXZhdGVTdWJuZXQnLCB0eXBlSW5kZXg6IHN1Ym5ldEluZGV4IH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6Um91dGVUYWJsZScgfVxuICAgIH0pO1xuICB9LFxuICBpbnRlcm5ldEdhdGV3YXlSb3V0ZShzdWJuZXRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0ludGVybmV0R2F0ZXdheScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpSb3V0ZScsIGluZGV4OiBzdWJuZXRJbmRleCB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29WcGNSb3V0ZShwdWJsaWNTdWJuZXRUYWJsZTogYm9vbGVhbiwgc3VibmV0SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGBBdGxhc01vbmdvJHtwdWJsaWNTdWJuZXRUYWJsZSA/ICdQdWJsaWNTdWJuZXQnIDogJ1ByaXZhdGVTdWJuZXQnfWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpSb3V0ZScsIGluZGV4OiBzdWJuZXRJbmRleCB9XG4gICAgfSk7XG4gIH0sXG4gIHJvdXRlVGFibGVUb1N1Ym5ldEFzc29jaWF0aW9uKHB1YmxpY1N1Ym5ldDogYm9vbGVhbiwgc3VibmV0SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IHB1YmxpY1N1Ym5ldCA/ICdQdWJsaWNTdWJuZXQnIDogJ1ByaXZhdGVTdWJuZXQnLCB0eXBlSW5kZXg6IHN1Ym5ldEluZGV4IH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U3VibmV0Um91dGVUYWJsZUFzc29jaWF0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIG5hdEdhdGV3YXkoYXpJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TmF0R2F0ZXdheScsIGluZGV4OiBhekluZGV4IH1cbiAgICB9KTtcbiAgfSxcbiAgbmF0RWxhc3RpY0lwKGF6SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdOYXQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6RUlQJywgaW5kZXg6IGF6SW5kZXggfVxuICAgIH0pO1xuICB9LFxuICBuYXRSb3V0ZShzdWJuZXRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ05hdFByaXZhdGVTdWJuZXQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6Um91dGUnLCBpbmRleDogc3VibmV0SW5kZXggfVxuICAgIH0pO1xuICB9LFxuICBldmVudEJ1cyhzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFdmVudHM6OkV2ZW50QnVzJyB9XG4gICAgfSk7XG4gIH0sXG4gIGV2ZW50QnVzQXJjaGl2ZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFdmVudHM6OkFyY2hpdmUnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzQ2x1c3RlcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNsdXN0ZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzVGFza0RlZmluaXRpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBlY3NTZXJ2aWNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBibHVlR3JlZW46IGJvb2xlYW4pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogYmx1ZUdyZWVuID8geyB0eXBlOiAnQmx1ZUdyZWVuJyB9IDogdW5kZWZpbmVkLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OlNlcnZpY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRXhlY3V0aW9uUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRWNzRXhlY3V0aW9uJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRWMySW5zdGFuY2VSb2xlKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFY3NJbnN0YW5jZSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBlY3NFYzJBdXRvc2NhbGluZ0dyb3VwV2FybVBvb2woc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6Oldhcm1Qb29sJyB9XG4gICAgfSk7XG4gIH0sXG4gIGV2ZW50QnVzUm9sZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaCgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgc2NoZWR1bGVyUnVsZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdTY2hlZHVsZWRJbnN0YW5jZVJlZnJlc2gnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkV2ZW50czo6UnVsZScgfVxuICAgIH0pO1xuICB9LFxuICBlY3NFYzJJbnN0YW5jZUxhdW5jaFRlbXBsYXRlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TGF1bmNoVGVtcGxhdGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRWMyQXV0b3NjYWxpbmdHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6QXV0b1NjYWxpbmdHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBlY3NFYzJGb3JjZURlbGV0ZUF1dG9zY2FsaW5nR3JvdXBDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdGb3JjZURlbGV0ZUFzZycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc0Rpc2FibGVNYW5hZ2VkVGVybWluYXRpb25Qcm90ZWN0aW9uQ3VzdG9tUmVzb3VyY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRGlzYWJsZU1hbmFnZWRUZXJtaW5hdGlvblByb3RlY3Rpb24nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBlY3NEZXJlZ2lzdGVyVGFyZ2V0c0N1c3RvbVJlc291cmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0RlcmVnaXN0ZXJUYXJnZXRzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcblxuICBlY3NFYzJDYXBhY2l0eVByb3ZpZGVyKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2FwYWNpdHlQcm92aWRlcicgfVxuICAgIH0pO1xuICB9LFxuICBlY3NFYzJDYXBhY2l0eVByb3ZpZGVyQXNzb2NpYXRpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDbHVzdGVyQ2FwYWNpdHlQcm92aWRlckFzc29jaWF0aW9ucycgfVxuICAgIH0pO1xuICB9LFxuICBlY3NFYzJJbnN0YW5jZVByb2ZpbGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0Vjc0luc3RhbmNlJ1xuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpJbnN0YW5jZVByb2ZpbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzVGFza1JvbGUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc0F1dG9TY2FsaW5nUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRWNzQXV0b1NjYWxlJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gZWNzU2NoZWR1bGVkTWFpbnRlbmFuY2VFdmVudEJ1c1J1bGUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgLy8gICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgLy8gICAgIHN0cFJlc291cmNlTmFtZSxcbiAgLy8gICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU2NoZWR1bGVkTWFpbnRlbmFuY2UnIH0sXG4gIC8vICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkV2ZW50czo6UnVsZScgfVxuICAvLyAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIC8vIH0sXG4gIGVjc1NjaGVkdWxlZE1haW50ZW5hbmNlTGFtYmRhUGVybWlzc2lvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdTY2hlZHVsZWRNYWludGVuYW5jZScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSkucmVwbGFjZUFsbCgnXycsICcnKTtcbiAgfSxcbiAgYmFzdGlvbkVjMkxhdW5jaFRlbXBsYXRlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TGF1bmNoVGVtcGxhdGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmFzdGlvbkVjMkluc3RhbmNlUHJvZmlsZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXN0aW9uRWMyQXV0b3NjYWxpbmdHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6QXV0b1NjYWxpbmdHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBiYXN0aW9uU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmFzdGlvbkN3QWdlbnRTc21Bc3NvY2lhdGlvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdDd0FnZW50JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTU006OkFzc29jaWF0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhc3Rpb25Tc21BZ2VudFNzbUFzc29jaWF0aW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1NzbUFnZW50JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTU006OkFzc29jaWF0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhc3Rpb25Sb2xlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXN0aW9uTG9nR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGxvZ1R5cGU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IHBhc2NhbENhc2UobG9nVHlwZSkgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmFzdGlvbkNsb3Vkd2F0Y2hTc21Eb2N1bWVudCgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQmFzdGlvbkNsb3Vkd2F0Y2hBZ2VudCcgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U1NNOjpEb2N1bWVudCcgfVxuICAgIH0pO1xuICB9LFxuICBzZXJ2aWNlRGlzY292ZXJ5RWNzU2VydmljZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgc2VydmljZVRhcmdldENvbnRhaW5lclBvcnQ6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGBQb3J0JHtzZXJ2aWNlVGFyZ2V0Q29udGFpbmVyUG9ydH1EaXNjb3ZlcnlgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlNlcnZpY2VEaXNjb3Zlcnk6OlNlcnZpY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgd29ya2xvYWRTZWN1cml0eUdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBsb2FkQmFsYW5jZXJTZWN1cml0eUdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0xiJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgdGFyZ2V0R3JvdXAoe1xuICAgIGxvYWRCYWxhbmNlck5hbWUsXG4gICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgIHRhcmdldENvbnRhaW5lclBvcnQsXG4gICAgYmx1ZUdyZWVuXG4gIH06IHtcbiAgICBzdHBSZXNvdXJjZU5hbWU6IHN0cmluZztcbiAgICBsb2FkQmFsYW5jZXJOYW1lOiBzdHJpbmc7XG4gICAgdGFyZ2V0Q29udGFpbmVyUG9ydD86IG51bWJlcjtcbiAgICBibHVlR3JlZW4/OiBib29sZWFuO1xuICB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogYCR7bG9hZEJhbGFuY2VyTmFtZX0ke3RhcmdldENvbnRhaW5lclBvcnQgPyBgVG9Qb3J0JHt0YXJnZXRDb250YWluZXJQb3J0fWAgOiAnJ30ke2JsdWVHcmVlbiA/ICdCRycgOiAnJ31gXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpUYXJnZXRHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFSb2xlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBkZWZhdWx0TGFtYmRhRnVuY3Rpb25Sb2xlKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdMYW1iZGEnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFQZXJtaXNzaW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBldmVudEluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRXZlbnQnLCB0eXBlSW5kZXg6IGV2ZW50SW5kZXggfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxhbWJkYVB1YmxpY1VybFBlcm1pc3Npb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnUHVibGljVXJsJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlBlcm1pc3Npb24nIH1cbiAgICB9KTtcbiAgfSxcbiAgbGFtYmRhSW90RXZlbnRQZXJtaXNzaW9uKHdvcmtsb2FkTmFtZTogc3RyaW5nLCBldmVudEluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gcGFzY2FsQ2FzZShgJHt3b3JrbG9hZE5hbWV9LUV2ZW50JHtldmVudEluZGV4fS1sYW1iZGEtaW90RXZlbnRQZXJtaXNzaW9uYCk7XG4gIH0sXG4gIGxhbWJkYVRhcmdldEdyb3VwUGVybWlzc2lvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgbG9hZEJhbGFuY2VyTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYCR7bG9hZEJhbGFuY2VyTmFtZX1UYXJnZXRHcm91cGAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGkoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpBcGknIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaUxvZ0dyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlMYW1iZGFJbnRlZ3JhdGlvbih7XG4gICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgIHN0cEh0dHBBcGlHYXRld2F5TmFtZVxuICB9OiB7XG4gICAgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmc7XG4gICAgc3RwSHR0cEFwaUdhdGV3YXlOYW1lOiBzdHJpbmc7XG4gIH0pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBzdHBIdHRwQXBpR2F0ZXdheU5hbWUgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpJbnRlZ3JhdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpQ29udGFpbmVyV29ya2xvYWRJbnRlZ3JhdGlvbih7XG4gICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgIHN0cEh0dHBBcGlHYXRld2F5TmFtZSxcbiAgICB0YXJnZXRDb250YWluZXJQb3J0XG4gIH06IHtcbiAgICBzdHBSZXNvdXJjZU5hbWU6IHN0cmluZztcbiAgICB0YXJnZXRDb250YWluZXJQb3J0OiBudW1iZXI7XG4gICAgc3RwSHR0cEFwaUdhdGV3YXlOYW1lOiBzdHJpbmc7XG4gIH0pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgJHtzdHBIdHRwQXBpR2F0ZXdheU5hbWV9VG9Qb3J0JHt0YXJnZXRDb250YWluZXJQb3J0fWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpJbnRlZ3JhdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpQXV0aG9yaXplcih7IG1ldGhvZCwgcGF0aCwgc3RwUmVzb3VyY2VOYW1lIH06IHsgbWV0aG9kOiBIdHRwTWV0aG9kOyBwYXRoOiBzdHJpbmc7IHN0cFJlc291cmNlTmFtZTogc3RyaW5nIH0pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZTogJycsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogYCR7c3RwUmVzb3VyY2VOYW1lfS0ke21ldGhvZCA9PT0gJyonID8gJ0FueScgOiBtZXRob2R9LSR7cGF0aCA9PT0gJyonID8gJ0RlZmF1bHQnIDogcGF0aH1gXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkF1dGhvcml6ZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaVJvdXRlKHsgbWV0aG9kLCBwYXRoLCBzdHBSZXNvdXJjZU5hbWUgfTogeyBtZXRob2Q6IEh0dHBNZXRob2Q7IHBhdGg6IHN0cmluZzsgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcgfSkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lOiAnJyxcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiBgJHtzdHBSZXNvdXJjZU5hbWV9LSR7bWV0aG9kID09PSAnKicgPyAnQW55JyA6IG1ldGhvZH0tJHtwYXRoID09PSAnKicgPyAnRGVmYXVsdCcgOiBwYXRofWBcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6Um91dGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaVZwY0xpbmsoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpWcGNMaW5rJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlWcGNMaW5rU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdWcGNMaW5rJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaUxhbWJkYVBlcm1pc3Npb24oe1xuICAgIHN0cFJlc291cmNlTmFtZU9mTGFtYmRhLFxuICAgIHN0cFJlc291cmNlTmFtZU9mSHR0cEFwaUdhdGV3YXlcbiAgfToge1xuICAgIHN0cFJlc291cmNlTmFtZU9mTGFtYmRhOiBzdHJpbmc7XG4gICAgc3RwUmVzb3VyY2VOYW1lT2ZIdHRwQXBpR2F0ZXdheTogc3RyaW5nO1xuICB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6IHN0cFJlc291cmNlTmFtZU9mTGFtYmRhLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IHN0cFJlc291cmNlTmFtZU9mSHR0cEFwaUdhdGV3YXkgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlTdGFnZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OlN0YWdlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlEb21haW4oZnVsbHlRdWFsaWZpZWREb21haW5OYW1lOiBzdHJpbmcpIHtcbiAgICAvLyB3ZSBkbyBub3QgYnVpbGQgYnVpbGQgdGhlIHJlc291cmNlIG5hbWUgY29udmVudGlvbmFsbHkgdGhyb3VnaCBzdHBSZXNvdXJjZU5hbWVcbiAgICAvLyB0aGlzIGlzIGR1ZSB0byB1cGRhdGUgYmVoYXZpb3JzIG9mIENsb3VkZm9ybWF0aW9uXG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6ICcnLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGdldFNwZWNpZmllckZvckRvbWFpblJlc291cmNlKGZ1bGx5UXVhbGlmaWVkRG9tYWluTmFtZSkgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpEb21haW5OYW1lJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlEZWZhdWx0RG9tYWluKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6RG9tYWluTmFtZScgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpRG9tYWluTWFwcGluZyhmdWxseVF1YWxpZmllZERvbWFpbk5hbWU6IHN0cmluZykge1xuICAgIC8vIHdlIGRvIG5vdCBidWlsZCBidWlsZCB0aGUgcmVzb3VyY2UgbmFtZSBjb252ZW50aW9uYWxseSB0aHJvdWdoIHN0cFJlc291cmNlTmFtZVxuICAgIC8vIHRoaXMgaXMgZHVlIHRvIHVwZGF0ZSBiZWhhdmlvcnMgb2YgQ2xvdWRmb3JtYXRpb25cbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZTogJycsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogZ2V0U3BlY2lmaWVyRm9yRG9tYWluUmVzb3VyY2UoZnVsbHlRdWFsaWZpZWREb21haW5OYW1lKSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkFwaU1hcHBpbmcnIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaURlZmF1bHREb21haW5NYXBwaW5nKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6QXBpTWFwcGluZycgfVxuICAgIH0pO1xuICB9LFxuICBsaXN0ZW5lcihleHBvc3VyZVBvcnQ6IG51bWJlciwgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgUG9ydCR7ZXhwb3N1cmVQb3J0fWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TGlzdGVuZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgbGlzdGVuZXJSdWxlKGV4cG9zdXJlUG9ydDogbnVtYmVyLCBzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgcnVsZVByaW9yaXR5OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgUG9ydCR7ZXhwb3N1cmVQb3J0fVByaW9yaXR5JHtydWxlUHJpb3JpdHl9YCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMaXN0ZW5lclJ1bGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgbGlzdGVuZXJDZXJ0aWZpY2F0ZUxpc3QoZXhwb3N1cmVQb3J0OiBudW1iZXIsIHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYFBvcnQke2V4cG9zdXJlUG9ydH1gIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6Okxpc3RlbmVyQ2VydGlmaWNhdGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgbG9hZEJhbGFuY2VyKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6OkxvYWRCYWxhbmNlcicgfVxuICAgIH0pO1xuICB9LFxuICBlY3NMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgY29udGFpbmVyTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogY29udGFpbmVyTmFtZSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBhdXRvU2NhbGluZ1RhcmdldChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsYWJsZVRhcmdldCcgfVxuICAgIH0pO1xuICB9LFxuICBkeW5hbW9BdXRvU2NhbGluZ1RhcmdldChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgbWV0cmljOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBtZXRyaWMgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnIH1cbiAgICB9KTtcbiAgfSxcbiAgYXV0b1NjYWxpbmdQb2xpY3koc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIG1ldHJpYzogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogbWV0cmljIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxpbmdQb2xpY3knIH1cbiAgICB9KTtcbiAgfSxcbiAgY3VzdG9tUmVzb3VyY2VTM0V2ZW50cygpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRXZlbnRzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gQGRlcHJlY2F0ZWRcbiAgLy8gc3RhY2t0YXBlU2VydmljZUN1c3RvbVJlc291cmNlRWRnZUZ1bmN0aW9ucygpIHtcbiAgLy8gICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgLy8gICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRWRnZUZ1bmN0aW9ucycgfSxcbiAgLy8gICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gIC8vICAgfSk7XG4gIC8vIH0sXG4gIGN1c3RvbVJlc291cmNlU2Vuc2l0aXZlRGF0YSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU2Vuc2l0aXZlRGF0YScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVJlc291cmNlQWNjZXB0VnBjUGVlcmluZ3MoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0FjY2VwdFZwY1BlZXJpbmdzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgY3VzdG9tUmVzb3VyY2VEZWZhdWx0RG9tYWluQ2VydCgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRGVmYXVsdERvbWFpbkNlcnQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBjdXN0b21SZXNvdXJjZUVkZ2VMYW1iZGFCdWNrZXQoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0VkZ2VMYW1iZGFCdWNrZXQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBjdXN0b21SZXNvdXJjZUVkZ2VMYW1iZGEoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRWRnZUxhbWJkYScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgY2RuPzogYm9vbGVhbikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGAke2NkbiA/ICdDZG4nIDogJyd9RGVmYXVsdERvbWFpbmAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVJlc291cmNlRGF0YWJhc2VEZWxldGlvblByb3RlY3Rpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRGVsZXRpb25Qcm90ZWN0aW9uJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgdXNlclBvb2woc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q29nbml0bzo6VXNlclBvb2wnIH1cbiAgICB9KTtcbiAgfSxcbiAgdXNlclBvb2xDbGllbnQoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q29nbml0bzo6VXNlclBvb2xDbGllbnQnIH1cbiAgICB9KTtcbiAgfSxcbiAgdXNlclBvb2xEb21haW4oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q29nbml0bzo6VXNlclBvb2xEb21haW4nIH1cbiAgICB9KTtcbiAgfSxcbiAgaWRlbnRpdHlQcm92aWRlcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgdHlwZTogU3RwVXNlckF1dGhQb29sWydpZGVudGl0eVByb3ZpZGVycyddW251bWJlcl1bJ3R5cGUnXSkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGUgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q29nbml0bzo6VXNlclBvb2xJZGVudGl0eVByb3ZpZGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGNvZ25pdG9MYW1iZGFIb29rUGVybWlzc2lvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgaG9va05hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGhvb2tOYW1lIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicgfVxuICAgIH0pO1xuICB9LFxuICBjb2duaXRvVXNlclBvb2xEZXRhaWxzQ3VzdG9tUmVzb3VyY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnVXNlclBvb2xEZXRhaWxzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgdXNlclBvb2xVaUN1c3RvbWl6YXRpb25BdHRhY2htZW50KHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sVUlDdXN0b21pemF0aW9uQXR0YWNobWVudCcgfVxuICAgIH0pO1xuICB9LFxuICBzZXJ2aWNlRGlzY292ZXJ5UHJpdmF0ZU5hbWVzcGFjZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRGlzY292ZXJ5JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTZXJ2aWNlRGlzY292ZXJ5OjpTZXJ2aWNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxhbWJkYUNvZGVEZXBsb3lBcHAoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0xhbWJkYUNvZGVEZXBsb3knIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkFwcGxpY2F0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIHNoYXJlZENodW5rTGF5ZXIobGF5ZXJOdW1iZXI6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGBTaGFyZWRDaHVua0xheWVyJHtsYXllck51bWJlcn1gIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6TGF5ZXJWZXJzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc0NvZGVEZXBsb3lBcHAoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0VDU0NvZGVEZXBsb3knIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkFwcGxpY2F0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIHN0YWNrQnVkZ2V0KHN0YWNrTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogcGFzY2FsQ2FzZShzdGFja05hbWUpLnJlcGxhY2VBbGwoJ18nLCAnJykgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QnVkZ2V0czo6QnVkZ2V0JyB9XG4gICAgfSk7XG4gIH0sXG4gIHVwc3Rhc2hSZWRpc0RhdGFiYXNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdVcHN0YXNoOjpEYXRhYmFzZXNWMTo6RGF0YWJhc2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgdXBzdGFzaENyZWRlbnRpYWxzUHJvdmlkZXIoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1Vwc3Rhc2hDcmVkZW50aWFsc1Byb3ZpZGVyJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgY2xvdWR3YXRjaEFsYXJtKHN0YWNrdGFwZUFsYXJtTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6IHN0YWNrdGFwZUFsYXJtTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRXYXRjaDo6QWxhcm0nIH1cbiAgICB9KS5yZXBsYWNlQWxsKCdfJywgJycpO1xuICB9LFxuICBjbG91ZHdhdGNoQWxhcm1FdmVudEJ1c05vdGlmaWNhdGlvblJ1bGUoc3RhY2t0YXBlQWxhcm1OYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZTogc3RhY2t0YXBlQWxhcm1OYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdOb3RpZmljYXRpb24nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkV2ZW50czo6UnVsZScgfVxuICAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIH0sXG4gIGNsb3Vkd2F0Y2hBbGFybUV2ZW50QnVzTm90aWZpY2F0aW9uUnVsZUxhbWJkYVBlcm1pc3Npb24oc3RhY2t0YXBlQWxhcm1OYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZTogc3RhY2t0YXBlQWxhcm1OYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdOb3RpZmljYXRpb24nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicgfVxuICAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIH0sXG4gIGNsb3Vkd2F0Y2hBbGFybVNoYXJlZEV2ZW50QnVzTm90aWZpY2F0aW9uUnVsZUxhbWJkYVBlcm1pc3Npb24oKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0Nsb3Vkd2F0Y2hBbGFybU5vdGlmaWNhdGlvblNoYXJlZCcgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSkucmVwbGFjZUFsbCgnXycsICcnKTtcbiAgfSxcbiAgc3FzUXVldWUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScgfVxuICAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIH0sXG4gIHNxc1F1ZXVlUG9saWN5KHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlNRUzo6UXVldWVQb2xpY3knIH1cbiAgICB9KTtcbiAgfSxcbiAgc25zVG9waWMoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U05TOjpUb3BpYycgfVxuICAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIH0sXG4gIGtpbmVzaXNTdHJlYW0oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6S2luZXNpczo6U3RyZWFtJyB9XG4gICAgfSk7XG4gIH0sXG4gIHdlYkFwcEZpcmV3YWxsQ3VzdG9tUmVzb3VyY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnV2ViQXBwRmlyZXdhbGwnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICB3ZWJBcHBGaXJld2FsbEFzc29jaWF0aW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OldBRnYyOjpXZWJBQ0xBc3NvY2lhdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBvcGVuU2VhcmNoRG9tYWluKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6Ok9wZW5TZWFyY2hTZXJ2aWNlOjpEb21haW4nIH1cbiAgICB9KTtcbiAgfSxcbiAgb3BlblNlYXJjaEN1c3RvbVJlc291cmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ09wZW5TZWFyY2gnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBvcGVuU2VhcmNoU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgbG9nRm9yd2FyZGluZ0ZpcmVob3NlVG9TM1JvbGUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnTG9nRm9yd2FyZGluZ1MzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgbG9nRm9yd2FyZGluZ0N3VG9GaXJlaG9zZVJvbGUoeyBsb2dHcm91cENmTG9naWNhbE5hbWUgfTogeyBsb2dHcm91cENmTG9naWNhbE5hbWU6IHN0cmluZyB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6IGxvZ0dyb3VwQ2ZMb2dpY2FsTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQ3dUb0ZpcmVob3NlJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgbG9nRm9yd2FyZGluZ0ZhaWxlZEV2ZW50c0J1Y2tldChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdMb2dGb3J3YXJkaW5nRmFpbGVkUmVjb3JkcycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfVxuICAgIH0pO1xuICB9LFxuICBsb2dGb3J3YXJkaW5nRmlyZWhvc2VEZWxpdmVyeVN0cmVhbSh7IGxvZ0dyb3VwQ2ZMb2dpY2FsTmFtZSB9OiB7IGxvZ0dyb3VwQ2ZMb2dpY2FsTmFtZTogc3RyaW5nIH0pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZTogbG9nR3JvdXBDZkxvZ2ljYWxOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpLaW5lc2lzRmlyZWhvc2U6OkRlbGl2ZXJ5U3RyZWFtJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxvZ0ZvcndhcmRpbmdTdWJzY3JpcHRpb25GaWx0ZXIoeyBsb2dHcm91cENmTG9naWNhbE5hbWUgfTogeyBsb2dHcm91cENmTG9naWNhbE5hbWU6IHN0cmluZyB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6IGxvZ0dyb3VwQ2ZMb2dpY2FsTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6U3Vic2NyaXB0aW9uRmlsdGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGlzc3VlRGV0ZWN0aW9uU3Vic2NyaXB0aW9uRmlsdGVyKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0lzc3VlRGV0ZWN0aW9uJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpTdWJzY3JpcHRpb25GaWx0ZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgaXNzdWVEZXRlY3Rpb25Mb2dzUGVybWlzc2lvbigpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnSXNzdWVEZXRlY3Rpb25Mb2dzJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlBlcm1pc3Npb24nIH1cbiAgICB9KTtcbiAgfVxufTtcblxuY29uc3QgYnVpbGRDZkxvZ2ljYWxOYW1lID0gKHtcbiAgc3RwUmVzb3VyY2VOYW1lLFxuICBzcGVjaWZpZXIsXG4gIHN1ZmZpeFxufToge1xuICBzdHBSZXNvdXJjZU5hbWU/OiBzdHJpbmc7XG4gIHNwZWNpZmllcj86IHsgdHlwZTogc3RyaW5nOyB0eXBlSW5kZXg/OiBudW1iZXI7IHN1YnR5cGU/OiBzdHJpbmcgfTtcbiAgc3VmZml4OiB7XG4gICAgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6IENsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlIHwgU3VwcG9ydGVkUHJpdmF0ZUNmUmVzb3VyY2VUeXBlO1xuICAgIGluZGV4PzogbnVtYmVyO1xuICB9O1xufSkgPT4ge1xuICBjb25zdCBzcGxpdHRlZFR5cGUgPSBzdWZmaXguY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGUuc3BsaXQoJzonKTtcbiAgY29uc3QgcmVzb2x2ZWRQYXJlbnROYW1lID0gc3RwUmVzb3VyY2VOYW1lIHx8ICdTdHAnO1xuICBjb25zdCByZXNvbHZlZFNwZWNpZmllciA9IHNwZWNpZmllclxuICAgID8gYCR7c3BlY2lmaWVyLnR5cGV9JHtzcGVjaWZpZXIudHlwZUluZGV4ICE9PSB1bmRlZmluZWQgPyBzcGVjaWZpZXIudHlwZUluZGV4IDogJyd9JHtcbiAgICAgICAgc3BlY2lmaWVyLnN1YnR5cGUgIT09IHVuZGVmaW5lZCA/IGAtJHtzcGVjaWZpZXIuc3VidHlwZX1gIDogJydcbiAgICAgIH1gXG4gICAgOiAnJztcbiAgY29uc3QgcmVzb2x2ZWRTdWZmaXggPSBgJHtzcGxpdHRlZFR5cGVbc3BsaXR0ZWRUeXBlLmxlbmd0aCAtIDFdfSR7c3VmZml4LmluZGV4ICE9PSB1bmRlZmluZWQgPyBzdWZmaXguaW5kZXggOiAnJ31gO1xuICByZXR1cm4gcGFzY2FsQ2FzZShgJHtyZXNvbHZlZFBhcmVudE5hbWV9LSR7cmVzb2x2ZWRTcGVjaWZpZXJ9LSR7cmVzb2x2ZWRTdWZmaXh9YCk7XG59O1xuXG5jb25zdCBnZXRTcGVjaWZpZXJGb3JEb21haW5SZXNvdXJjZSA9IChmdWxseVF1YWxpZmllZERvbWFpbk5hbWUpID0+IHtcbiAgaWYgKHBhc2NhbENhc2UoZnVsbHlRdWFsaWZpZWREb21haW5OYW1lKS5yZXBsYWNlKCdfJywgJycpLmxlbmd0aCA8IDg1KSB7XG4gICAgcmV0dXJuIHBhc2NhbENhc2UoZnVsbHlRdWFsaWZpZWREb21haW5OYW1lKS5yZXBsYWNlKCdfJywgJycpO1xuICB9XG4gIGNvbnN0IHNwbGl0dGVkRG9tYWluID0gZnVsbHlRdWFsaWZpZWREb21haW5OYW1lXG4gICAgLnNwbGl0KCcuJylcbiAgICAubWFwKChzdWJkb21haW4pID0+IHN1YmRvbWFpbi5zcGxpdCgnLScpKVxuICAgIC5mbGF0KCk7XG4gIGNvbnN0IG1heENoYXJhY3RlcnNQZXJXb3JkID0gTWF0aC5mbG9vcig4NSAvIHNwbGl0dGVkRG9tYWluLmxlbmd0aCk7XG4gIHJldHVybiBzcGxpdHRlZERvbWFpbi5tYXAoKHdvcmQpID0+IHBhc2NhbENhc2Uod29yZC5zbGljZSgwLCBtYXhDaGFyYWN0ZXJzUGVyV29yZCkpLnJlcGxhY2UoJ18nLCAnJykpLmpvaW4oJycpO1xufTtcbiIsCiAgICAiaW1wb3J0IHsgY2ZMb2dpY2FsTmFtZXMgfSBmcm9tICcuLi8uLi8uLi8uLi9zaGFyZWQvbmFtaW5nL2xvZ2ljYWwtbmFtZXMnO1xuXG5leHBvcnQgY29uc3QgQ0hJTERfUkVTT1VSQ0VTOiBSZWNvcmQ8XG4gIFN0cFJlc291cmNlVHlwZSxcbiAgQXJyYXk8eyBsb2dpY2FsTmFtZTogKC4uLmFyZ3M6IGFueVtdKSA9PiBzdHJpbmc7IHJlc291cmNlVHlwZTogc3RyaW5nOyBjb25kaXRpb25hbD86IHRydWU7IHVucmVzb2x2YWJsZT86IHRydWUgfT5cbj4gPSB7XG4gIC8vID09PT09IEJVQ0tFVCA9PT09PVxuICBidWNrZXQ6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXQsIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXRQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBGVU5DVElPTiA9PT09PVxuICBmdW5jdGlvbjogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVmc0FjY2Vzc1BvaW50LCByZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6QWNjZXNzUG9pbnQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLndvcmtsb2FkU2VjdXJpdHlHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVVybCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVB1YmxpY1VybFBlcm1pc3Npb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFJbnZva2VDb25maWcsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6RXZlbnRJbnZva2VDb25maWcnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFDb2RlRGVwbG95QXBwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpBcHBsaWNhdGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVZlcnNpb25QdWJsaXNoZXJDdXN0b21SZXNvdXJjZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY29kZURlcGxveURlcGxveW1lbnRHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6RGVwbG95bWVudEdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFTdHBBbGlhcywgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkFsaWFzJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhUGVybWlzc2lvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IFJFTEFUSU9OQUwgREFUQUJBU0UgPT09PT1cbiAgJ3JlbGF0aW9uYWwtZGF0YWJhc2UnOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZGJTdWJuZXRHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6OkRCU3VibmV0R3JvdXAnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZGJTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VEYXRhYmFzZURlbGV0aW9uUHJvdGVjdGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXJvcmFEYkNsdXN0ZXIsIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQkNsdXN0ZXInLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXJvcmFEYkNsdXN0ZXJQYXJhbWV0ZXJHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQkNsdXN0ZXJQYXJhbWV0ZXJHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1cm9yYURiQ2x1c3RlckxvZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1cm9yYURiSW5zdGFuY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJJbnN0YW5jZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1cm9yYURiSW5zdGFuY2VQYXJhbWV0ZXJHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQlBhcmFtZXRlckdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kYkluc3RhbmNlLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJJbnN0YW5jZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRiSW5zdGFuY2VMb2dHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRiT3B0aW9uR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpPcHRpb25Hcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRiSW5zdGFuY2VQYXJhbWV0ZXJHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQlBhcmFtZXRlckdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZGJSZXBsaWNhLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6OkRCSW5zdGFuY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kYlJlcGxpY2FMb2dHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gRFlOQU1PIERCIFRBQkxFID09PT09XG4gICdkeW5hbW8tZGItdGFibGUnOiBbeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZHluYW1vR2xvYmFsVGFibGUsIHJlc291cmNlVHlwZTogJ0FXUzo6RHluYW1vREI6Okdsb2JhbFRhYmxlJyB9XSxcblxuICAvLyA9PT09PSBIVFRQIEFQSSBHQVRFV0FZID09PT09XG4gICdodHRwLWFwaS1nYXRld2F5JzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGksIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpBcGknIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaVN0YWdlLCByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6U3RhZ2UnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaUxvZ0dyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaVZwY0xpbmtTZWN1cml0eUdyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlWcGNMaW5rLCByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6VnBjTGluaycsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaURvbWFpbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkRvbWFpbk5hbWUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpRG9tYWluTWFwcGluZyxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpBcGlNYXBwaW5nJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6RG9tYWluTmFtZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlEZWZhdWx0RG9tYWluTWFwcGluZyxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpBcGlNYXBwaW5nJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRuc1JlY29yZCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSb3V0ZTUzOjpSZWNvcmRTZXQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdENhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21PcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRPcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERpc3RyaWJ1dGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RGlzdHJpYnV0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IEJBVENIIEpPQiA9PT09PVxuICAnYmF0Y2gtam9iJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhdGNoU2VydmljZVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaFNwb3RGbGVldFJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaEluc3RhbmNlUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhdGNoSW5zdGFuY2VQcm9maWxlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6SW5zdGFuY2VQcm9maWxlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaFN0YXRlTWFjaGluZUV4ZWN1dGlvblJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hJbnN0YW5jZUxhdW5jaFRlbXBsYXRlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkxhdW5jaFRlbXBsYXRlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hJbnN0YW5jZURlZmF1bHRTZWN1cml0eUdyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaENvbXB1dGVFbnZpcm9ubWVudCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QmF0Y2g6OkNvbXB1dGVFbnZpcm9ubWVudCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hKb2JRdWV1ZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpCYXRjaDo6Sm9iUXVldWUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhdGNoSm9iRGVmaW5pdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpCYXRjaDo6Sm9iRGVmaW5pdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaFN0YXRlTWFjaGluZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hKb2JMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hKb2JFeGVjdXRpb25Sb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb1VzZXJBc3NvY2lhdGVkV2l0aFJvbGUsXG4gICAgICByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpEYXRhYmFzZVVzZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gRVZFTlQgQlVTID09PT09XG4gICdldmVudC1idXMnOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZXZlbnRCdXMsIHJlc291cmNlVHlwZTogJ0FXUzo6RXZlbnRzOjpFdmVudEJ1cycgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5ldmVudEJ1c0FyY2hpdmUsIHJlc291cmNlVHlwZTogJ0FXUzo6RXZlbnRzOjpBcmNoaXZlJywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFNUQVRFIE1BQ0hJTkUgPT09PT1cbiAgJ3N0YXRlLW1hY2hpbmUnOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZ2xvYmFsU3RhdGVNYWNoaW5lc1JvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zdGF0ZU1hY2hpbmUsIHJlc291cmNlVHlwZTogJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJyB9XG4gIF0sXG5cbiAgLy8gPT09PT0gUkVESVMgQ0xVU1RFUiA9PT09PVxuICAncmVkaXMtY2x1c3Rlcic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5yZWRpc1BhcmFtZXRlckdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aUNhY2hlOjpQYXJhbWV0ZXJHcm91cCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5yZWRpc1N1Ym5ldEdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aUNhY2hlOjpTdWJuZXRHcm91cCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5yZWRpc1NlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnJlZGlzTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnJlZGlzUmVwbGljYXRpb25Hcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGlDYWNoZTo6UmVwbGljYXRpb25Hcm91cCcgfVxuICBdLFxuXG4gIC8vID09PT09IE1PTkdPIERCIEFUTEFTIENMVVNURVIgPT09PT1cbiAgJ21vbmdvLWRiLWF0bGFzLWNsdXN0ZXInOiBbXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29DcmVkZW50aWFsc1Byb3ZpZGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29Qcm9qZWN0LCByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpQcm9qZWN0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb1Byb2plY3RJcEFjY2Vzc0xpc3QsXG4gICAgICByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpQcm9qZWN0SXBBY2Nlc3NMaXN0JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb1Byb2plY3RWcGNOZXR3b3JrQ29udGFpbmVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6TmV0d29ya0NvbnRhaW5lcicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29Qcm9qZWN0VnBjTmV0d29ya1BlZXJpbmcsXG4gICAgICByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpOZXR3b3JrUGVlcmluZycsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb1ZwY1JvdXRlLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6Um91dGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29DbHVzdGVyLCByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpDbHVzdGVyJyB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdGxhc01vbmdvQ2x1c3Rlck1hc3RlclVzZXIsXG4gICAgICByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpEYXRhYmFzZVVzZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gVVNFUiBBVVRIIFBPT0wgPT09PT1cbiAgJ3VzZXItYXV0aC1wb29sJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVzZXJQb29sLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNuc1JvbGVTZW5kU21zRnJvbUNvZ25pdG8sIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVzZXJQb29sQ2xpZW50LCByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sQ2xpZW50JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVzZXJQb29sRG9tYWluLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sRG9tYWluJyB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jb2duaXRvVXNlclBvb2xEZXRhaWxzQ3VzdG9tUmVzb3VyY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZSdcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5pZGVudGl0eVByb3ZpZGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2duaXRvOjpVc2VyUG9vbElkZW50aXR5UHJvdmlkZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jb2duaXRvTGFtYmRhSG9va1Blcm1pc3Npb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVzZXJQb29sVWlDdXN0b21pemF0aW9uQXR0YWNobWVudCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q29nbml0bzo6VXNlclBvb2xVSUN1c3RvbWl6YXRpb25BdHRhY2htZW50JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMud2ViQXBwRmlyZXdhbGxBc3NvY2lhdGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6V0FGdjI6OldlYkFDTEFzc29jaWF0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IFVQU1RBU0ggUkVESVMgPT09PT1cbiAgJ3Vwc3Rhc2gtcmVkaXMnOiBbXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVwc3Rhc2hDcmVkZW50aWFsc1Byb3ZpZGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnVwc3Rhc2hSZWRpc0RhdGFiYXNlLCByZXNvdXJjZVR5cGU6ICdVcHN0YXNoOjpSZWRpczo6RGF0YWJhc2UnIH1cbiAgXSxcblxuICAvLyA9PT09PSBBUFBMSUNBVElPTiBMT0FEIEJBTEFOQ0VSID09PT09XG4gICdhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxvYWRCYWxhbmNlciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMb2FkQmFsYW5jZXInIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubG9hZEJhbGFuY2VyU2VjdXJpdHlHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLndlYkFwcEZpcmV3YWxsQXNzb2NpYXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OldBRnYyOjpXZWJBQ0xBc3NvY2lhdGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGlzdGVuZXIsIHJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TGlzdGVuZXInLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gTkVUV09SSyBMT0FEIEJBTEFOQ0VSID09PT09XG4gICduZXR3b3JrLWxvYWQtYmFsYW5jZXInOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubG9hZEJhbGFuY2VyLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6OkxvYWRCYWxhbmNlcicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sb2FkQmFsYW5jZXJTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5saXN0ZW5lciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMaXN0ZW5lcicsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IEhPU1RJTkcgQlVDS0VUID09PT09XG4gIC8vIEhvc3RpbmcgYnVja2V0IGRlbGVnYXRlcyB0byBhIGJ1Y2tldCByZXNvdXJjZSwgc28gaXQgaW5jbHVkZXMgYWxsIGJ1Y2tldCBjaGlsZCByZXNvdXJjZXNcbiAgJ2hvc3RpbmctYnVja2V0JzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldFBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFdFQiBBUFAgRklSRVdBTEwgPT09PT1cbiAgJ3dlYi1hcHAtZmlyZXdhbGwnOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMud2ViQXBwRmlyZXdhbGxDdXN0b21SZXNvdXJjZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgXSxcblxuICAvLyA9PT09PSBPUEVOIFNFQVJDSCBET01BSU4gPT09PT1cbiAgJ29wZW4tc2VhcmNoLWRvbWFpbic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5vcGVuU2VhcmNoRG9tYWluLCByZXNvdXJjZVR5cGU6ICdBV1M6Ok9wZW5TZWFyY2hTZXJ2aWNlOjpEb21haW4nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMub3BlblNlYXJjaFNlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMub3BlblNlYXJjaERvbWFpbkxvZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLm9wZW5TZWFyY2hDdXN0b21SZXNvdXJjZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IEVGUyBGSUxFU1lTVEVNID09PT09XG4gICdlZnMtZmlsZXN5c3RlbSc6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lZnNGaWxlc3lzdGVtLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6RmlsZVN5c3RlbScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lZnNTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWZzTW91bnRUYXJnZXQsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6TW91bnRUYXJnZXQnLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IE5FWFRKUyBXRUIgPT09PT1cbiAgLy8gTmV4dEpTIHdlYiBkZWxlZ2F0ZXMgdG86IGJ1Y2tldCwgaW1hZ2VGdW5jdGlvbiwgcmV2YWxpZGF0aW9uRnVuY3Rpb24sIHJldmFsaWRhdGlvblF1ZXVlLFxuICAvLyByZXZhbGlkYXRpb25UYWJsZSwgcmV2YWxpZGF0aW9uSW5zZXJ0RnVuY3Rpb24sIGFuZCBvcHRpb25hbGx5IHNlcnZlckVkZ2VGdW5jdGlvbiBvciBzZXJ2ZXJGdW5jdGlvblxuICAnbmV4dGpzLXdlYic6IFtcbiAgICAvLyBOZXh0SlMtc3BlY2lmaWMgcmVzb3VyY2VzXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLm9wZW5OZXh0SG9zdEhlYWRlclJld3JpdGVGdW5jdGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RnVuY3Rpb24nXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMub3Blbk5leHRBc3NldFJlcGxhY2VyQ3VzdG9tUmVzb3VyY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZSdcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5vcGVuTmV4dER5bmFtb0luc2VydEN1c3RvbVJlc291cmNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnXG4gICAgfSxcbiAgICAvLyBGcm9tIGJ1Y2tldFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldFBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICAvLyBGcm9tIGZ1bmN0aW9ucyAoaW1hZ2VGdW5jdGlvbiwgcmV2YWxpZGF0aW9uRnVuY3Rpb24sIHNlcnZlckZ1bmN0aW9uLCB3YXJtZXJGdW5jdGlvbiwgcmV2YWxpZGF0aW9uSW5zZXJ0RnVuY3Rpb24pXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVVybCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgLy8gRnJvbSBlZGdlIGZ1bmN0aW9uIChzZXJ2ZXJFZGdlRnVuY3Rpb24pXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRWRnZUxhbWJkYSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICAvLyBGcm9tIHJldmFsaWRhdGlvblF1ZXVlXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3FzUXVldWUsIHJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zcXNRdWV1ZVBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTUVM6OlF1ZXVlUG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICAvLyBGcm9tIHJldmFsaWRhdGlvblRhYmxlXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZHluYW1vR2xvYmFsVGFibGUsIHJlc291cmNlVHlwZTogJ0FXUzo6RHluYW1vREI6Okdsb2JhbFRhYmxlJyB9XG4gIF0sXG5cbiAgLy8gPT09PT0gTVVMVEktQ09OVEFJTkVSIFdPUktMT0FEID09PT09XG4gICdtdWx0aS1jb250YWluZXItd29ya2xvYWQnOiBbXG4gICAgLy8gU2hhcmVkIGdsb2JhbCByZXNvdXJjZXMgKGNvbmRpdGlvbmFsIC0gY3JlYXRlZCBvbmx5IG9uY2UgaWYgbm90IGV4aXN0cylcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFeGVjdXRpb25Sb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQXV0b1NjYWxpbmdSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgLy8gU2NhbGluZyByZXNvdXJjZXMgKGNvbmRpdGlvbmFsIC0gb25seSBpZiBzY2FsaW5nIGlzIGNvbmZpZ3VyZWQpXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1dG9TY2FsaW5nVGFyZ2V0LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsYWJsZVRhcmdldCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1dG9TY2FsaW5nUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsaW5nUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICAvLyBFQzItYmFzZWQgcmVzb3VyY2VzIChjb25kaXRpb25hbCAtIG9ubHkgaWYgaW5zdGFuY2VUeXBlcyBhcmUgY29uZmlndXJlZClcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZXZlbnRCdXNSb2xlRm9yU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlUHJvZmlsZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlTGF1bmNoVGVtcGxhdGUsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TGF1bmNoVGVtcGxhdGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJBdXRvc2NhbGluZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6QXV0b1NjYWxpbmdHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkZvcmNlRGVsZXRlQXV0b3NjYWxpbmdHcm91cEN1c3RvbVJlc291cmNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJDYXBhY2l0eVByb3ZpZGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNhcGFjaXR5UHJvdmlkZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJDYXBhY2l0eVByb3ZpZGVyQXNzb2NpYXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2x1c3RlckNhcGFjaXR5UHJvdmlkZXJBc3NvY2lhdGlvbnMnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zY2hlZHVsZXJSdWxlRm9yU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpTY2hlZHVsZXI6OlNjaGVkdWxlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQXV0b3NjYWxpbmdHcm91cFdhcm1Qb29sLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6V2FybVBvb2wnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIC8vIERlcGxveW1lbnQgcmVzb3VyY2VzIChjb25kaXRpb25hbCAtIG9ubHkgaWYgZGVwbG95bWVudCBpcyBjb25maWd1cmVkKVxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0NvZGVEZXBsb3lBcHAsIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6QXBwbGljYXRpb24nLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jb2RlRGVwbG95RGVwbG95bWVudEdyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpEZXBsb3ltZW50R3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIC8vIENvcmUgcmVzb3VyY2VzIChhbHdheXMgcHJlc2VudClcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NDbHVzdGVyLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2x1c3RlcicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy53b3JrbG9hZFNlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NTZXJ2aWNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OlNlcnZpY2UnLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NUYXNrUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzVGFza0RlZmluaXRpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicgfSxcbiAgICAvLyBDb25kaXRpb25hbCByZXNvdXJjZXNcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzTG9nR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lZnNBY2Nlc3NQb2ludCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFRlM6OkFjY2Vzc1BvaW50JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb1VzZXJBc3NvY2lhdGVkV2l0aFJvbGUsXG4gICAgICByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpEYXRhYmFzZVVzZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gU1FTIFFVRVVFID09PT09XG4gICdzcXMtcXVldWUnOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3FzUXVldWUsIHJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zcXNRdWV1ZVBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTUVM6OlF1ZXVlUG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFNOUyBUT1BJQyA9PT09PVxuICAnc25zLXRvcGljJzogW3sgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNuc1RvcGljLCByZXNvdXJjZVR5cGU6ICdBV1M6OlNOUzo6VG9waWMnIH1dLFxuXG4gIC8vID09PT09IEtJTkVTSVMgU1RSRUFNID09PT09XG4gICdraW5lc2lzLXN0cmVhbSc6IFt7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5raW5lc2lzU3RyZWFtLCByZXNvdXJjZVR5cGU6ICdBV1M6OktpbmVzaXM6OlN0cmVhbScgfV0sXG5cbiAgLy8gPT09PT0gQkFTVElPTiA9PT09PVxuICBiYXN0aW9uOiBbXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhc3Rpb25DbG91ZHdhdGNoU3NtRG9jdW1lbnQsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OlNTTTo6RG9jdW1lbnQnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhc3Rpb25FYzJBdXRvc2NhbGluZ0dyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkF1dG9TY2FsaW5nOjpBdXRvU2NhbGluZ0dyb3VwJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhc3Rpb25TZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXN0aW9uRWMyTGF1bmNoVGVtcGxhdGUsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpMYXVuY2hUZW1wbGF0ZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXN0aW9uUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmFzdGlvbkVjMkluc3RhbmNlUHJvZmlsZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXN0aW9uQ3dBZ2VudFNzbUFzc29jaWF0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OlNTTTo6QXNzb2NpYXRpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmFzdGlvblNzbUFnZW50U3NtQXNzb2NpYXRpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6U1NNOjpBc3NvY2lhdGlvbicgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmFzdGlvbkxvZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH1cbiAgXSxcblxuICAvLyA9PT09PSBFREdFIExBTUJEQSBGVU5DVElPTiA9PT09PVxuICAnZWRnZS1sYW1iZGEtZnVuY3Rpb24nOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VFZGdlTGFtYmRhLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICBdLFxuXG4gIC8vID09PT09IFdFQiBTRVJWSUNFID09PT09XG4gIC8vIFdlYiBzZXJ2aWNlIGRlbGVnYXRlcyB0bzogY29udGFpbmVyV29ya2xvYWQgKyBvcHRpb25hbGx5IChodHRwQXBpR2F0ZXdheSBPUiBsb2FkQmFsYW5jZXIgT1IgbmV0d29ya0xvYWRCYWxhbmNlcilcbiAgJ3dlYi1zZXJ2aWNlJzogW1xuICAgIC8vIEZyb20gbXVsdGktY29udGFpbmVyLXdvcmtsb2FkIC0gY29yZSByZXNvdXJjZXMgKGFsd2F5cyBwcmVzZW50KVxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0NsdXN0ZXIsIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDbHVzdGVyJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLndvcmtsb2FkU2VjdXJpdHlHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc1NlcnZpY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6U2VydmljZScsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc1Rhc2tSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NUYXNrRGVmaW5pdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJyB9LFxuICAgIC8vIEZyb20gbXVsdGktY29udGFpbmVyLXdvcmtsb2FkIC0gY29uZGl0aW9uYWwgcmVzb3VyY2VzXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRXhlY3V0aW9uUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0F1dG9TY2FsaW5nUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXRvU2NhbGluZ1RhcmdldCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXRvU2NhbGluZ1BvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGluZ1BvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMySW5zdGFuY2VSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmV2ZW50QnVzUm9sZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZVByb2ZpbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpJbnN0YW5jZVByb2ZpbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZUxhdW5jaFRlbXBsYXRlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkxhdW5jaFRlbXBsYXRlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQXV0b3NjYWxpbmdHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6OkF1dG9TY2FsaW5nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJGb3JjZURlbGV0ZUF1dG9zY2FsaW5nR3JvdXBDdXN0b21SZXNvdXJjZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQ2FwYWNpdHlQcm92aWRlcixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDYXBhY2l0eVByb3ZpZGVyJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQ2FwYWNpdHlQcm92aWRlckFzc29jaWF0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNsdXN0ZXJDYXBhY2l0eVByb3ZpZGVyQXNzb2NpYXRpb25zJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc2NoZWR1bGVyUnVsZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6U2NoZWR1bGVyOjpTY2hlZHVsZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkF1dG9zY2FsaW5nR3JvdXBXYXJtUG9vbCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6Oldhcm1Qb29sJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NDb2RlRGVwbG95QXBwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkFwcGxpY2F0aW9uJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY29kZURlcGxveURlcGxveW1lbnRHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6RGVwbG95bWVudEdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzTG9nR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lZnNBY2Nlc3NQb2ludCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFRlM6OkFjY2Vzc1BvaW50JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICAvLyBGcm9tIGFwcGxpY2F0aW9uLWxvYWQtYmFsYW5jZXIgKGNvbmRpdGlvbmFsIC0gb25seSBpZiBBTEIgaXMgdXNlZClcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubG9hZEJhbGFuY2VyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMb2FkQmFsYW5jZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sb2FkQmFsYW5jZXJTZWN1cml0eUdyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxpc3RlbmVyLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6Okxpc3RlbmVyJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMud2ViQXBwRmlyZXdhbGxBc3NvY2lhdGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6V0FGdjI6OldlYkFDTEFzc29jaWF0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICAvLyBGcm9tIGh0dHAtYXBpLWdhdGV3YXkgKGNvbmRpdGlvbmFsIC0gb25seSBpZiBIVFRQIEFQSSBHYXRld2F5IGlzIHVzZWQsIGFsdGVybmF0aXZlIHRvIEFMQi9OTEIpXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkFwaScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaVN0YWdlLCByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6U3RhZ2UnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlWcGNMaW5rU2VjdXJpdHlHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpVnBjTGluaywgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OlZwY0xpbmsnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlEb21haW4sIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpEb21haW5OYW1lJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaURvbWFpbk1hcHBpbmcsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6QXBpTWFwcGluZycsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkRvbWFpbk5hbWUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpRGVmYXVsdERvbWFpbk1hcHBpbmcsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6QXBpTWFwcGluZycsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgLy8gQ29tbW9uIHJlc291cmNlcyAoZG9tYWlucywgQ0ROIC0gYWxsIGNvbmRpdGlvbmFsKVxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gUFJJVkFURSBTRVJWSUNFID09PT09XG4gIC8vIFByaXZhdGUgc2VydmljZSBkZWxlZ2F0ZXMgdG86IGNvbnRhaW5lcldvcmtsb2FkICsgb3B0aW9uYWxseSBsb2FkQmFsYW5jZXJcbiAgJ3ByaXZhdGUtc2VydmljZSc6IFtcbiAgICAvLyBGcm9tIG11bHRpLWNvbnRhaW5lci13b3JrbG9hZCAtIGNvcmUgcmVzb3VyY2VzIChhbHdheXMgcHJlc2VudClcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NDbHVzdGVyLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2x1c3RlcicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy53b3JrbG9hZFNlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NTZXJ2aWNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OlNlcnZpY2UnLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NUYXNrUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzVGFza0RlZmluaXRpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicgfSxcbiAgICAvLyBGcm9tIG11bHRpLWNvbnRhaW5lci13b3JrbG9hZCAtIGNvbmRpdGlvbmFsIHJlc291cmNlc1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0V4ZWN1dGlvblJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NBdXRvU2NhbGluZ1JvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXV0b1NjYWxpbmdUYXJnZXQsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxhYmxlVGFyZ2V0JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXV0b1NjYWxpbmdQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxpbmdQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5ldmVudEJ1c1JvbGVGb3JTY2hlZHVsZWRJbnN0YW5jZVJlZnJlc2gsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMySW5zdGFuY2VQcm9maWxlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6SW5zdGFuY2VQcm9maWxlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMySW5zdGFuY2VMYXVuY2hUZW1wbGF0ZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpMYXVuY2hUZW1wbGF0ZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkF1dG9zY2FsaW5nR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkF1dG9TY2FsaW5nOjpBdXRvU2NhbGluZ0dyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyRm9yY2VEZWxldGVBdXRvc2NhbGluZ0dyb3VwQ3VzdG9tUmVzb3VyY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkNhcGFjaXR5UHJvdmlkZXIsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2FwYWNpdHlQcm92aWRlcicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkNhcGFjaXR5UHJvdmlkZXJBc3NvY2lhdGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDbHVzdGVyQ2FwYWNpdHlQcm92aWRlckFzc29jaWF0aW9ucycsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNjaGVkdWxlclJ1bGVGb3JTY2hlZHVsZWRJbnN0YW5jZVJlZnJlc2gsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OlNjaGVkdWxlcjo6U2NoZWR1bGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJBdXRvc2NhbGluZ0dyb3VwV2FybVBvb2wsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkF1dG9TY2FsaW5nOjpXYXJtUG9vbCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQ29kZURlcGxveUFwcCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpBcHBsaWNhdGlvbicsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNvZGVEZXBsb3lEZXBsb3ltZW50R3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkRlcGxveW1lbnRHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0xvZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWZzQWNjZXNzUG9pbnQsIHJlc291cmNlVHlwZTogJ0FXUzo6RUZTOjpBY2Nlc3NQb2ludCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgLy8gRnJvbSBhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyIChjb25kaXRpb25hbCAtIG9ubHkgaWYgQUxCIGlzIGNvbmZpZ3VyZWQpXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxvYWRCYWxhbmNlcixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TG9hZEJhbGFuY2VyJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubG9hZEJhbGFuY2VyU2VjdXJpdHlHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5saXN0ZW5lciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMaXN0ZW5lcicsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFdPUktFUiBTRVJWSUNFID09PT09XG4gIC8vIFdvcmtlciBzZXJ2aWNlIGRlbGVnYXRlcyB0bzogY29udGFpbmVyV29ya2xvYWQgb25seVxuICAnd29ya2VyLXNlcnZpY2UnOiBbXG4gICAgLy8gRnJvbSBtdWx0aS1jb250YWluZXItd29ya2xvYWQgLSBjb3JlIHJlc291cmNlcyAoYWx3YXlzIHByZXNlbnQpXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQ2x1c3RlciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNsdXN0ZXInIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMud29ya2xvYWRTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzU2VydmljZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpTZXJ2aWNlJyxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzVGFza1JvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc1Rhc2tEZWZpbml0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nIH0sXG4gICAgLy8gRnJvbSBtdWx0aS1jb250YWluZXItd29ya2xvYWQgLSBjb25kaXRpb25hbCByZXNvdXJjZXNcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFeGVjdXRpb25Sb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQXV0b1NjYWxpbmdSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1dG9TY2FsaW5nVGFyZ2V0LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsYWJsZVRhcmdldCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1dG9TY2FsaW5nUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsaW5nUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZXZlbnRCdXNSb2xlRm9yU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlUHJvZmlsZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlTGF1bmNoVGVtcGxhdGUsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TGF1bmNoVGVtcGxhdGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJBdXRvc2NhbGluZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6QXV0b1NjYWxpbmdHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkZvcmNlRGVsZXRlQXV0b3NjYWxpbmdHcm91cEN1c3RvbVJlc291cmNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJDYXBhY2l0eVByb3ZpZGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNhcGFjaXR5UHJvdmlkZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJDYXBhY2l0eVByb3ZpZGVyQXNzb2NpYXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2x1c3RlckNhcGFjaXR5UHJvdmlkZXJBc3NvY2lhdGlvbnMnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zY2hlZHVsZXJSdWxlRm9yU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpTY2hlZHVsZXI6OlNjaGVkdWxlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQXV0b3NjYWxpbmdHcm91cFdhcm1Qb29sLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6V2FybVBvb2wnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0NvZGVEZXBsb3lBcHAsIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6QXBwbGljYXRpb24nLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jb2RlRGVwbG95RGVwbG95bWVudEdyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpEZXBsb3ltZW50R3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NMb2dHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVmc0FjY2Vzc1BvaW50LCByZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6QWNjZXNzUG9pbnQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdGxhc01vbmdvVXNlckFzc29jaWF0ZWRXaXRoUm9sZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ01vbmdvREI6OlN0cEF0bGFzVjE6OkRhdGFiYXNlVXNlcicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH1cbiAgXSxcblxuICAvLyA9PT09PSBBU1RSTyBXRUIgPT09PT1cbiAgJ2FzdHJvLXdlYic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zc3JXZWJIb3N0SGVhZGVyUmV3cml0ZUZ1bmN0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldFBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGEsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhVXJsLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6VXJsJywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IE5VWFQgV0VCID09PT09XG4gICdudXh0LXdlYic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zc3JXZWJIb3N0SGVhZGVyUmV3cml0ZUZ1bmN0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldFBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGEsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhVXJsLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6VXJsJywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFNWRUxURUtJVCBXRUIgPT09PT1cbiAgJ3N2ZWx0ZWtpdC13ZWInOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3NyV2ViSG9zdEhlYWRlclJld3JpdGVGdW5jdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXQsIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXRQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVVybCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBTT0xJRFNUQVJUIFdFQiA9PT09PVxuICAnc29saWRzdGFydC13ZWInOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3NyV2ViSG9zdEhlYWRlclJld3JpdGVGdW5jdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXQsIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXRQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVVybCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBUQU5TVEFDSyBXRUIgPT09PT1cbiAgJ3RhbnN0YWNrLXdlYic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zc3JXZWJIb3N0SGVhZGVyUmV3cml0ZUZ1bmN0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldFBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGEsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhVXJsLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6VXJsJywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IFJFTUlYIFdFQiA9PT09PVxuICAncmVtaXgtd2ViJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNzcldlYkhvc3RIZWFkZXJSZXdyaXRlRnVuY3Rpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYnVja2V0LCByZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYnVja2V0UG9saWN5LCByZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXRQb2xpY3knLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdENhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21PcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRPcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERpc3RyaWJ1dGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RGlzdHJpYnV0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRuc1JlY29yZCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSb3V0ZTUzOjpSZWNvcmRTZXQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYUxvZ0dyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFVcmwsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpVcmwnLCBjb25kaXRpb25hbDogdHJ1ZSB9XG4gIF0sXG5cbiAgLy8gPT09PT0gT1RIRVIgUkVTT1VSQ0VTID09PT09XG4gICdjdXN0b20tcmVzb3VyY2UtaW5zdGFuY2UnOiBbXSxcbiAgJ2N1c3RvbS1yZXNvdXJjZS1kZWZpbml0aW9uJzogW10sXG4gICdkZXBsb3ltZW50LXNjcmlwdCc6IFtdLFxuICAnYXdzLWNkay1jb25zdHJ1Y3QnOiBbXVxufTtcbiIsCiAgICAiaW1wb3J0IHsgQ0hJTERfUkVTT1VSQ0VTIH0gZnJvbSAnLi9jaGlsZC1yZXNvdXJjZXMnO1xuXG4vLyBQcml2YXRlIHN5bWJvbHMgZm9yIGludGVybmFsIG1ldGhvZHMgLSBub3QgYWNjZXNzaWJsZSBmcm9tIG91dHNpZGVcbi8vIFVzZSBTeW1ib2wuZm9yKCkgc28gaXQgY2FuIGJlIGFjY2Vzc2VkIGFjcm9zcyBtb2R1bGVzIChjcnVjaWFsIGZvciBucG0gcGFja2FnZSBpbnRlcm9wKVxuY29uc3QgZ2V0UGFyYW1SZWZlcmVuY2VTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6Z2V0UGFyYW1SZWZlcmVuY2UnKTtcbmNvbnN0IGdldFR5cGVTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6Z2V0VHlwZScpO1xuY29uc3QgZ2V0UHJvcGVydGllc1N5bWJvbCA9IFN5bWJvbC5mb3IoJ3N0YWNrdGFwZTpnZXRQcm9wZXJ0aWVzJyk7XG5jb25zdCBnZXRPdmVycmlkZXNTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6Z2V0T3ZlcnJpZGVzJyk7XG5jb25zdCBnZXRUcmFuc2Zvcm1zU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmdldFRyYW5zZm9ybXMnKTtcbmNvbnN0IHNldFJlc291cmNlTmFtZVN5bWJvbCA9IFN5bWJvbC5mb3IoJ3N0YWNrdGFwZTpzZXRSZXNvdXJjZU5hbWUnKTtcbmNvbnN0IHJlc291cmNlUGFyYW1SZWZTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6aXNSZXNvdXJjZVBhcmFtUmVmJyk7XG5jb25zdCBiYXNlVHlwZVByb3BlcnRpZXNTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6aXNCYXNlVHlwZVByb3BlcnRpZXMnKTtcbmNvbnN0IGFsYXJtU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmlzQWxhcm0nKTtcblxuLy8gRHVjay10eXBlIGNoZWNrZXJzIC0gdXNlIHN5bWJvbHMgaW5zdGVhZCBvZiBpbnN0YW5jZW9mIGZvciBjcm9zcy1tb2R1bGUgY29tcGF0aWJpbGl0eVxuY29uc3QgaXNCYXNlUmVzb3VyY2UgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBCYXNlUmVzb3VyY2UgPT5cbiAgdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiBzZXRSZXNvdXJjZU5hbWVTeW1ib2wgaW4gdmFsdWU7XG5cbmNvbnN0IGlzQmFzZVR5cGVQcm9wZXJ0aWVzID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgQmFzZVR5cGVQcm9wZXJ0aWVzID0+XG4gIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgYmFzZVR5cGVQcm9wZXJ0aWVzU3ltYm9sIGluIHZhbHVlO1xuXG5jb25zdCBpc0FsYXJtID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgQWxhcm0gPT4gdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiBhbGFybVN5bWJvbCBpbiB2YWx1ZTtcblxuY29uc3QgaXNSZXNvdXJjZVBhcmFtUmVmZXJlbmNlID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgUmVzb3VyY2VQYXJhbVJlZmVyZW5jZSA9PlxuICB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHJlc291cmNlUGFyYW1SZWZTeW1ib2wgaW4gdmFsdWU7XG5cbmNvbnN0IGRlZmVycmVkTmFtZVN5bWJvbCA9IFN5bWJvbC5mb3IoJ3N0YWNrdGFwZTppc0RlZmVycmVkUmVzb3VyY2VOYW1lJyk7XG5cbmNvbnN0IGlzRGVmZXJyZWRSZXNvdXJjZU5hbWUgPSAodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBEZWZlcnJlZFJlc291cmNlTmFtZSA9PlxuICB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIGRlZmVycmVkTmFtZVN5bWJvbCBpbiB2YWx1ZTtcblxuLyoqXG4gKiBBIGRlZmVycmVkIHJlZmVyZW5jZSB0byBhIHJlc291cmNlJ3MgbmFtZS5cbiAqIFVzZWQgd2hlbiBhY2Nlc3NpbmcgcmVzb3VyY2VOYW1lIGJlZm9yZSB0aGUgbmFtZSBpcyBzZXQuXG4gKiBSZXNvbHZlcyBsYXppbHkgZHVyaW5nIHRyYW5zZm9ybWF0aW9uLlxuICovXG5jbGFzcyBEZWZlcnJlZFJlc291cmNlTmFtZSB7XG4gIHByaXZhdGUgX19yZXNvdXJjZTogQmFzZVJlc291cmNlO1xuICByZWFkb25seSBbZGVmZXJyZWROYW1lU3ltYm9sXSA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IocmVzb3VyY2U6IEJhc2VSZXNvdXJjZSkge1xuICAgIHRoaXMuX19yZXNvdXJjZSA9IHJlc291cmNlO1xuICB9XG5cbiAgcmVzb2x2ZSgpOiBzdHJpbmcge1xuICAgIC8vIEF0IHJlc29sdXRpb24gdGltZSwgdGhlIG5hbWUgc2hvdWxkIGJlIHNldFxuICAgIGNvbnN0IG5hbWUgPSAodGhpcy5fX3Jlc291cmNlIGFzIGFueSkuX3Jlc291cmNlTmFtZTtcbiAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdSZXNvdXJjZSBuYW1lIG5vdCBzZXQuIE1ha2Ugc3VyZSB0byBhZGQgdGhlIHJlc291cmNlIHRvIHRoZSByZXNvdXJjZXMgb2JqZWN0IGluIHlvdXIgY29uZmlnLiAnICtcbiAgICAgICAgICAnVGhlIHJlc291cmNlIG5hbWUgaXMgYXV0b21hdGljYWxseSBkZXJpdmVkIGZyb20gdGhlIG9iamVjdCBrZXkuJ1xuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnJlc29sdmUoKTtcbiAgfVxuXG4gIHRvSlNPTigpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnJlc29sdmUoKTtcbiAgfVxuXG4gIHZhbHVlT2YoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIHJlZmVyZW5jZSB0byBhIHJlc291cmNlIHBhcmFtZXRlciB0aGF0IHdpbGwgYmUgcmVzb2x2ZWQgYXQgcnVudGltZS5cbiAqIFN0b3JlcyBhIHJlZmVyZW5jZSB0byB0aGUgcmVzb3VyY2UgZm9yIGxhenkgbmFtZSByZXNvbHV0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgUmVzb3VyY2VQYXJhbVJlZmVyZW5jZSB7XG4gIHByaXZhdGUgX19yZXNvdXJjZTogQmFzZVJlc291cmNlO1xuICBwcml2YXRlIF9fcGFyYW06IHN0cmluZztcbiAgcmVhZG9ubHkgW3Jlc291cmNlUGFyYW1SZWZTeW1ib2xdID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3RvcihyZXNvdXJjZTogQmFzZVJlc291cmNlLCBwYXJhbTogc3RyaW5nKSB7XG4gICAgdGhpcy5fX3Jlc291cmNlID0gcmVzb3VyY2U7XG4gICAgdGhpcy5fX3BhcmFtID0gcGFyYW07XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJFJlc291cmNlUGFyYW0oJyR7dGhpcy5fX3Jlc291cmNlLnJlc291cmNlTmFtZX0nLCAnJHt0aGlzLl9fcGFyYW19JylgO1xuICB9XG5cbiAgdG9KU09OKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcbiAgfVxuXG4gIC8vIEFsbG93IHRoZSByZWZlcmVuY2UgdG8gYmUgdXNlZCBkaXJlY3RseSBpbiB0ZW1wbGF0ZSBzdHJpbmdzXG4gIHZhbHVlT2YoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xuICB9XG59XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgdHlwZS9wcm9wZXJ0aWVzIHN0cnVjdHVyZXMgKGVuZ2luZXMsIHBhY2thZ2luZywgZXZlbnRzLCBldGMuKVxuICovXG5leHBvcnQgY2xhc3MgQmFzZVR5cGVQcm9wZXJ0aWVzIHtcbiAgcHVibGljIHJlYWRvbmx5IHR5cGU6IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IHByb3BlcnRpZXM6IGFueTtcbiAgcmVhZG9ubHkgW2Jhc2VUeXBlUHJvcGVydGllc1N5bWJvbF0gPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKHR5cGU6IHN0cmluZywgcHJvcGVydGllczogYW55KSB7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLnByb3BlcnRpZXMgPSBwcm9wZXJ0aWVzO1xuICB9XG59XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgdHlwZS1vbmx5IHN0cnVjdHVyZXMgKG5vIHByb3BlcnRpZXMgZmllbGQsIGp1c3QgdHlwZSBkaXNjcmltaW5hdG9yKVxuICovXG5leHBvcnQgY2xhc3MgQmFzZVR5cGVPbmx5IHtcbiAgcHVibGljIHJlYWRvbmx5IHR5cGU6IHN0cmluZztcbiAgcmVhZG9ubHkgW2Jhc2VUeXBlUHJvcGVydGllc1N5bWJvbF0gPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKHR5cGU6IHN0cmluZykge1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZpbmVzIGEgQ2xvdWRXYXRjaCBhbGFybSB0aGF0IG1vbml0b3JzIGEgbWV0cmljIGFuZCB0cmlnZ2VycyBub3RpZmljYXRpb25zIHdoZW4gdGhyZXNob2xkcyBhcmUgYnJlYWNoZWQuXG4gKlxuICogQWxhcm1zIGNhbiBiZSBhdHRhY2hlZCB0byByZXNvdXJjZXMgbGlrZSBMYW1iZGEgZnVuY3Rpb25zLCBkYXRhYmFzZXMsIGxvYWQgYmFsYW5jZXJzLCBTUVMgcXVldWVzLCBhbmQgSFRUUCBBUEkgR2F0ZXdheXMuXG4gKiBXaGVuIHRoZSBhbGFybSBjb25kaXRpb24gaXMgbWV0IChlLmcuLCBlcnJvciByYXRlIGV4Y2VlZHMgNSUpLCBub3RpZmljYXRpb25zIGFyZSBzZW50IHRvIGNvbmZpZ3VyZWQgdGFyZ2V0cyAoU2xhY2ssIGVtYWlsLCBNUyBUZWFtcykuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBuZXcgQWxhcm0oe1xuICogICB0cmlnZ2VyOiBuZXcgTGFtYmRhRXJyb3JSYXRlVHJpZ2dlcih7IHRocmVzaG9sZFBlcmNlbnQ6IDUgfSksXG4gKiAgIGV2YWx1YXRpb246IHsgcGVyaW9kOiA2MCwgZXZhbHVhdGlvblBlcmlvZHM6IDMsIGJyZWFjaGVkUGVyaW9kczogMiB9LFxuICogICBub3RpZmljYXRpb25UYXJnZXRzOiBbeyBzbGFjazogeyB1cmw6ICRTZWNyZXQoJ3NsYWNrLXdlYmhvb2stdXJsJykgfSB9XSxcbiAqICAgZGVzY3JpcHRpb246ICdMYW1iZGEgZXJyb3IgcmF0ZSBleGNlZWRlZCA1JSdcbiAqIH0pXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEFsYXJtIHtcbiAgcmVhZG9ubHkgW2FsYXJtU3ltYm9sXSA9IHRydWU7XG4gIHB1YmxpYyByZWFkb25seSB0cmlnZ2VyOiBhbnk7XG4gIHB1YmxpYyByZWFkb25seSBldmFsdWF0aW9uPzogYW55O1xuICBwdWJsaWMgcmVhZG9ubHkgbm90aWZpY2F0aW9uVGFyZ2V0cz86IGFueVtdO1xuICBwdWJsaWMgcmVhZG9ubHkgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHJvcHM6IHsgdHJpZ2dlcjogYW55OyBldmFsdWF0aW9uPzogYW55OyBub3RpZmljYXRpb25UYXJnZXRzPzogYW55W107IGRlc2NyaXB0aW9uPzogc3RyaW5nIH0pIHtcbiAgICB0aGlzLnRyaWdnZXIgPSBwcm9wcy50cmlnZ2VyO1xuICAgIHRoaXMuZXZhbHVhdGlvbiA9IHByb3BzLmV2YWx1YXRpb247XG4gICAgdGhpcy5ub3RpZmljYXRpb25UYXJnZXRzID0gcHJvcHMubm90aWZpY2F0aW9uVGFyZ2V0cztcbiAgICB0aGlzLmRlc2NyaXB0aW9uID0gcHJvcHMuZGVzY3JpcHRpb247XG4gIH1cbn1cblxuLyoqXG4gKiBCYXNlIHJlc291cmNlIGNsYXNzIHRoYXQgcHJvdmlkZXMgY29tbW9uIGZ1bmN0aW9uYWxpdHlcbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2VSZXNvdXJjZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3R5cGU6IHN0cmluZztcbiAgcHJpdmF0ZSBfcHJvcGVydGllczogYW55O1xuICBwcml2YXRlIF9vdmVycmlkZXM/OiBhbnk7XG4gIHByaXZhdGUgX3RyYW5zZm9ybXM/OiBhbnk7XG4gIHByaXZhdGUgX3Jlc291cmNlTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIF9leHBsaWNpdE5hbWU6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLCB0eXBlOiBzdHJpbmcsIHByb3BlcnRpZXM6IGFueSwgb3ZlcnJpZGVzPzogYW55KSB7XG4gICAgdGhpcy5fcmVzb3VyY2VOYW1lID0gbmFtZTtcbiAgICB0aGlzLl9leHBsaWNpdE5hbWUgPSBuYW1lICE9PSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fdHlwZSA9IHR5cGU7XG5cbiAgICAvLyBTdG9yZSBwcm9wZXJ0aWVzIGFuZCBvdmVycmlkZXMgaW5pdGlhbGx5IC0gdGhleSdsbCBiZSBwcm9jZXNzZWQgd2hlbiBuYW1lIGlzIHNldFxuICAgIHRoaXMuX3Byb3BlcnRpZXMgPSBwcm9wZXJ0aWVzO1xuICAgIHRoaXMuX292ZXJyaWRlcyA9IG92ZXJyaWRlcztcblxuICAgIC8vIElmIG5hbWUgaXMgYWxyZWFkeSBzZXQsIHByb2Nlc3Mgb3ZlcnJpZGVzIGFuZCB0cmFuc2Zvcm1zIG5vd1xuICAgIGlmIChuYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX3Byb2Nlc3NPdmVycmlkZXNBbmRUcmFuc2Zvcm1zKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3Mgb3ZlcnJpZGVzIGFuZCB0cmFuc2Zvcm1zIGV4dHJhY3Rpb24gZnJvbSBwcm9wZXJ0aWVzLlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgcmVzb3VyY2UgbmFtZSBpcyBhdmFpbGFibGUuXG4gICAqL1xuICBwcml2YXRlIF9wcm9jZXNzT3ZlcnJpZGVzQW5kVHJhbnNmb3JtcygpOiB2b2lkIHtcbiAgICBjb25zdCBwcm9wZXJ0aWVzID0gdGhpcy5fcHJvcGVydGllcztcbiAgICBpZiAocHJvcGVydGllcyAmJiB0eXBlb2YgcHJvcGVydGllcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIENsb25lIHByb3BlcnRpZXMgd2l0aG91dCBvdmVycmlkZXMgYW5kIHRyYW5zZm9ybXNcbiAgICAgIGNvbnN0IGZpbmFsUHJvcGVydGllcyA9IHsgLi4ucHJvcGVydGllcyB9O1xuXG4gICAgICAvLyBIYW5kbGUgb3ZlcnJpZGVzIGZyb20gcHJvcGVydGllcyAoaWYgdGhleSB3ZXJlbid0IGV4dHJhY3RlZCBieSBjaGlsZCBjbGFzcylcbiAgICAgIGlmICgnb3ZlcnJpZGVzJyBpbiBmaW5hbFByb3BlcnRpZXMpIHtcbiAgICAgICAgY29uc3QgcHJvcGVydGllc092ZXJyaWRlcyA9IGZpbmFsUHJvcGVydGllcy5vdmVycmlkZXM7XG4gICAgICAgIGRlbGV0ZSBmaW5hbFByb3BlcnRpZXMub3ZlcnJpZGVzO1xuXG4gICAgICAgIC8vIFRyYW5zZm9ybSBvdmVycmlkZXMgdXNpbmcgY2ZMb2dpY2FsTmFtZXNcbiAgICAgICAgaWYgKHByb3BlcnRpZXNPdmVycmlkZXMgJiYgdHlwZW9mIHByb3BlcnRpZXNPdmVycmlkZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgdGhpcy5fb3ZlcnJpZGVzID0gdHJhbnNmb3JtT3ZlcnJpZGVzVG9Mb2dpY2FsTmFtZXModGhpcy5fcmVzb3VyY2VOYW1lISwgdGhpcy5fdHlwZSwgcHJvcGVydGllc092ZXJyaWRlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSGFuZGxlIHRyYW5zZm9ybXMgZnJvbSBwcm9wZXJ0aWVzIChpZiB0aGV5IHdlcmVuJ3QgZXh0cmFjdGVkIGJ5IGNoaWxkIGNsYXNzKVxuICAgICAgaWYgKCd0cmFuc2Zvcm1zJyBpbiBmaW5hbFByb3BlcnRpZXMpIHtcbiAgICAgICAgY29uc3QgcHJvcGVydGllc1RyYW5zZm9ybXMgPSBmaW5hbFByb3BlcnRpZXMudHJhbnNmb3JtcztcbiAgICAgICAgZGVsZXRlIGZpbmFsUHJvcGVydGllcy50cmFuc2Zvcm1zO1xuXG4gICAgICAgIC8vIFRyYW5zZm9ybSB0cmFuc2Zvcm1zIHVzaW5nIGNmTG9naWNhbE5hbWVzIChzYW1lIG1hcHBpbmcgYXMgb3ZlcnJpZGVzKVxuICAgICAgICBpZiAocHJvcGVydGllc1RyYW5zZm9ybXMgJiYgdHlwZW9mIHByb3BlcnRpZXNUcmFuc2Zvcm1zID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIHRoaXMuX3RyYW5zZm9ybXMgPSB0cmFuc2Zvcm1UcmFuc2Zvcm1zVG9Mb2dpY2FsTmFtZXModGhpcy5fcmVzb3VyY2VOYW1lISwgdGhpcy5fdHlwZSwgcHJvcGVydGllc1RyYW5zZm9ybXMpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3Byb3BlcnRpZXMgPSBmaW5hbFByb3BlcnRpZXM7XG4gICAgfVxuXG4gICAgLy8gQWxzbyB0cmFuc2Zvcm0gb3ZlcnJpZGVzL3RyYW5zZm9ybXMgdGhhdCB3ZXJlIHBhc3NlZCBkaXJlY3RseSB2aWEgY29uc3RydWN0b3JcbiAgICAvLyAod2hlbiBjaGlsZCBjbGFzcyBleHRyYWN0cyB0aGVtIGJlZm9yZSBjYWxsaW5nIHN1cGVyKVxuICAgIGlmICh0aGlzLl9vdmVycmlkZXMgJiYgdHlwZW9mIHRoaXMuX292ZXJyaWRlcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHRoaXMuX292ZXJyaWRlcyA9IHRyYW5zZm9ybU92ZXJyaWRlc1RvTG9naWNhbE5hbWVzKHRoaXMuX3Jlc291cmNlTmFtZSEsIHRoaXMuX3R5cGUsIHRoaXMuX292ZXJyaWRlcyk7XG4gICAgfVxuICAgIGlmICh0aGlzLl90cmFuc2Zvcm1zICYmIHR5cGVvZiB0aGlzLl90cmFuc2Zvcm1zID09PSAnb2JqZWN0Jykge1xuICAgICAgdGhpcy5fdHJhbnNmb3JtcyA9IHRyYW5zZm9ybVRyYW5zZm9ybXNUb0xvZ2ljYWxOYW1lcyh0aGlzLl9yZXNvdXJjZU5hbWUhLCB0aGlzLl90eXBlLCB0aGlzLl90cmFuc2Zvcm1zKTtcbiAgICB9XG4gIH1cblxuICAvLyBQdWJsaWMgZ2V0dGVyIGZvciByZXNvdXJjZSBuYW1lICh1c2VkIGZvciByZWZlcmVuY2luZyByZXNvdXJjZXMpXG4gIC8vIFJldHVybnMgYSBkZWZlcnJlZCByZWZlcmVuY2Ugd2hlbiBuYW1lIGlzbid0IHNldCB5ZXQsIHdoaWNoIHJlc29sdmVzIGR1cmluZyB0cmFuc2Zvcm1hdGlvblxuICBnZXQgcmVzb3VyY2VOYW1lKCk6IHN0cmluZyB7XG4gICAgaWYgKHRoaXMuX3Jlc291cmNlTmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBSZXR1cm4gYSBkZWZlcnJlZCByZWZlcmVuY2UgdGhhdCB3aWxsIHJlc29sdmUgZHVyaW5nIHRyYW5zZm9ybWF0aW9uXG4gICAgICAvLyBUeXBlU2NyaXB0IHNlZXMgdGhpcyBhcyBzdHJpbmcgZHVlIHRvIHRvU3RyaW5nL3ZhbHVlT2YsIHJ1bnRpbWUgcmVzb2x2ZXMgbGF6aWx5XG4gICAgICByZXR1cm4gbmV3IERlZmVycmVkUmVzb3VyY2VOYW1lKHRoaXMpIGFzIHVua25vd24gYXMgc3RyaW5nO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fcmVzb3VyY2VOYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIEludGVybmFsIG1ldGhvZCB0byBzZXQgdGhlIHJlc291cmNlIG5hbWUgZnJvbSB0aGUgb2JqZWN0IGtleS5cbiAgICogQ2FsbGVkIGJ5IHRyYW5zZm9ybUNvbmZpZ1dpdGhSZXNvdXJjZXMuXG4gICAqL1xuICBbc2V0UmVzb3VyY2VOYW1lU3ltYm9sXShuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fZXhwbGljaXROYW1lICYmIHRoaXMuX3Jlc291cmNlTmFtZSAhPT0gbmFtZSkge1xuICAgICAgLy8gSWYgYW4gZXhwbGljaXQgbmFtZSB3YXMgcHJvdmlkZWQgYW5kIGl0IGRpZmZlcnMgZnJvbSB0aGUga2V5LCB1c2UgdGhlIGV4cGxpY2l0IG5hbWVcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3Jlc291cmNlTmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9yZXNvdXJjZU5hbWUgPSBuYW1lO1xuICAgICAgLy8gTm93IHRoYXQgd2UgaGF2ZSBhIG5hbWUsIHByb2Nlc3Mgb3ZlcnJpZGVzIGFuZCB0cmFuc2Zvcm1zXG4gICAgICB0aGlzLl9wcm9jZXNzT3ZlcnJpZGVzQW5kVHJhbnNmb3JtcygpO1xuICAgIH1cbiAgfVxuXG4gIC8vIFByaXZhdGUgbWV0aG9kcyB1c2luZyBzeW1ib2xzIC0gbm90IGFjY2Vzc2libGUgZnJvbSBvdXRzaWRlIG9yIGluIGF1dG9jb21wbGV0ZVxuICBbZ2V0UGFyYW1SZWZlcmVuY2VTeW1ib2xdKHBhcmFtTmFtZTogc3RyaW5nKTogUmVzb3VyY2VQYXJhbVJlZmVyZW5jZSB7XG4gICAgcmV0dXJuIG5ldyBSZXNvdXJjZVBhcmFtUmVmZXJlbmNlKHRoaXMsIHBhcmFtTmFtZSk7XG4gIH1cblxuICBbZ2V0VHlwZVN5bWJvbF0oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fdHlwZTtcbiAgfVxuXG4gIFtnZXRQcm9wZXJ0aWVzU3ltYm9sXSgpOiBhbnkge1xuICAgIHJldHVybiB0aGlzLl9wcm9wZXJ0aWVzO1xuICB9XG5cbiAgW2dldE92ZXJyaWRlc1N5bWJvbF0oKTogYW55IHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5fb3ZlcnJpZGVzO1xuICB9XG5cbiAgW2dldFRyYW5zZm9ybXNTeW1ib2xdKCk6IGFueSB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX3RyYW5zZm9ybXM7XG4gIH1cbn1cblxuLyoqXG4gKiBGbGF0dGVuIG5lc3RlZCBvYmplY3RzIGludG8gZG90LW5vdGF0aW9uIHBhdGhzLlxuICogRS5nLiwgeyBTbXNDb25maWd1cmF0aW9uOiB7IEV4dGVybmFsSWQ6ICd2YWx1ZScgfSB9IGJlY29tZXMgeyAnU21zQ29uZmlndXJhdGlvbi5FeHRlcm5hbElkJzogJ3ZhbHVlJyB9XG4gKiBQcmVzZXJ2ZXMgYXJyYXlzLCBub24tcGxhaW4gb2JqZWN0cywgYW5kIG1hcC1saWtlIG9iamVjdHMgd2l0aCBzcGVjaWFsIGtleXMgYXMgbGVhZiB2YWx1ZXMuXG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW5Ub0RvdE5vdGF0aW9uKG9iajogYW55LCBwcmVmaXggPSAnJyk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcblxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBjb25zdCB2YWx1ZSA9IG9ialtrZXldO1xuICAgIGNvbnN0IG5ld0tleSA9IHByZWZpeCA/IGAke3ByZWZpeH0uJHtrZXl9YCA6IGtleTtcblxuICAgIC8vIENoZWNrIGlmIHZhbHVlIGlzIGEgcGxhaW4gb2JqZWN0IChub3QgYXJyYXksIG5vdCBudWxsLCBub3Qgc3BlY2lhbCB0eXBlcylcbiAgICBpZiAodmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09IE9iamVjdCkge1xuICAgICAgLy8gUHJlc2VydmUgbWFwLWxpa2Ugb2JqZWN0cyB3aXRoIG5vbi1wYXRoLXNhZmUga2V5cyAoZm9yIGV4YW1wbGVcbiAgICAgIC8vIFJEUyBwYXJhbWV0ZXIgbmFtZXMgbGlrZSBcInJkcy5hbGxvd2VkX2V4dGVuc2lvbnNcIiBvciBPcGVuU2VhcmNoIG9wdGlvbnMpLlxuICAgICAgLy8gVGhpcyBwcmV2ZW50cyBzcGxpdHRpbmcgbGl0ZXJhbCBrZXlzIGludG8gbmVzdGVkIHBhdGhzIGxhdGVyLlxuICAgICAgaWYgKE9iamVjdC5rZXlzKHZhbHVlKS5zb21lKChjaGlsZEtleSkgPT4gIS9eW0EtWmEtejAtOV9dKyQvLnRlc3QoY2hpbGRLZXkpKSkge1xuICAgICAgICByZXN1bHRbbmV3S2V5XSA9IHZhbHVlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIFJlY3Vyc2l2ZWx5IGZsYXR0ZW4gbmVzdGVkIG9iamVjdHNcbiAgICAgIE9iamVjdC5hc3NpZ24ocmVzdWx0LCBmbGF0dGVuVG9Eb3ROb3RhdGlvbih2YWx1ZSwgbmV3S2V5KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIExlYWYgdmFsdWUgLSBrZWVwIGFzIGlzXG4gICAgICByZXN1bHRbbmV3S2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIHVzZXItZnJpZW5kbHkgb3ZlcnJpZGVzICh3aXRoIHByb3BlcnR5IG5hbWVzIGxpa2UgJ2J1Y2tldCcsICdsYW1iZGFMb2dHcm91cCcpXG4gKiB0byBDbG91ZEZvcm1hdGlvbiBsb2dpY2FsIG5hbWVzIHVzaW5nIGNmTG9naWNhbE5hbWVzXG4gKi9cbmZ1bmN0aW9uIHRyYW5zZm9ybU92ZXJyaWRlc1RvTG9naWNhbE5hbWVzKHJlc291cmNlTmFtZTogc3RyaW5nLCByZXNvdXJjZVR5cGU6IHN0cmluZywgb3ZlcnJpZGVzOiBhbnkpOiBhbnkge1xuICAvLyBHZXQgY2hpbGQgcmVzb3VyY2VzIGZvciB0aGlzIHJlc291cmNlIHR5cGVcbiAgY29uc3QgY2hpbGRSZXNvdXJjZXMgPSBDSElMRF9SRVNPVVJDRVNbcmVzb3VyY2VUeXBlXSB8fCBbXTtcblxuICAvLyBCdWlsZCBhIG1hcCBvZiBwcm9wZXJ0eSBuYW1lcyB0byBjaGlsZCByZXNvdXJjZXNcbiAgY29uc3QgcHJvcGVydHlOYW1lTWFwID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKTtcblxuICBmb3IgKGNvbnN0IGNoaWxkUmVzb3VyY2Ugb2YgY2hpbGRSZXNvdXJjZXMpIHtcbiAgICAvLyBUaGUgbG9naWNhbE5hbWUgZnVuY3Rpb24gaGFzIGEgbmFtZSBwcm9wZXJ0eSB0aGF0IG1hdGNoZXMgdGhlIHByb3BlcnR5IG5hbWVcbiAgICBpZiAoY2hpbGRSZXNvdXJjZS5sb2dpY2FsTmFtZSAmJiBjaGlsZFJlc291cmNlLmxvZ2ljYWxOYW1lLm5hbWUpIHtcbiAgICAgIHByb3BlcnR5TmFtZU1hcC5zZXQoY2hpbGRSZXNvdXJjZS5sb2dpY2FsTmFtZS5uYW1lLCBjaGlsZFJlc291cmNlKTtcbiAgICB9XG4gIH1cblxuICAvLyBUcmFuc2Zvcm0gb3ZlcnJpZGVzIG9iamVjdFxuICBjb25zdCB0cmFuc2Zvcm1lZE92ZXJyaWRlczogYW55ID0ge307XG4gIGNvbnN0IGVycm9yTWVzc2FnZSA9IGBPdmVycmlkZSBvZiBwcm9wZXJ0eSB7cHJvcGVydHlOYW1lfSBvZiByZXNvdXJjZSAke3Jlc291cmNlTmFtZX0gaXMgbm90IHN1cHBvcnRlZC5cXG5cblJlbW92ZSB0aGUgb3ZlcnJpZGUsIHJ1biAnc3RhY2t0YXBlIGNvbXBpbGU6dGVtcGxhdGUnIGNvbW1hbmQsIGFuZCBmaW5kIHRoZSBsb2dpY2FsIG5hbWUgb2YgdGhlIHJlc291cmNlIHlvdSB3YW50IHRvIG92ZXJyaWRlIG1hbnVhbGx5LiBUaGVuIGFkZCBpdCB0byB0aGUgb3ZlcnJpZGVzIG9iamVjdC5gO1xuXG4gIGZvciAoY29uc3QgcHJvcGVydHlOYW1lIGluIG92ZXJyaWRlcykge1xuICAgIGNvbnN0IGNoaWxkUmVzb3VyY2UgPSBwcm9wZXJ0eU5hbWVNYXAuZ2V0KHByb3BlcnR5TmFtZSk7XG5cbiAgICAvLyBTa2lwIHVucmVzb2x2YWJsZSByZXNvdXJjZXNcbiAgICBpZiAoY2hpbGRSZXNvdXJjZT8udW5yZXNvbHZhYmxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNZXNzYWdlLnJlcGxhY2UoJ3twcm9wZXJ0eU5hbWV9JywgcHJvcGVydHlOYW1lKSk7XG4gICAgfVxuXG4gICAgaWYgKGNoaWxkUmVzb3VyY2UpIHtcbiAgICAgIGNvbnN0IGxvZ2ljYWxOYW1lRm4gPSBjaGlsZFJlc291cmNlLmxvZ2ljYWxOYW1lO1xuICAgICAgLy8gQ2FsbCB0aGUgY2ZMb2dpY2FsTmFtZXMgZnVuY3Rpb24gdG8gZ2V0IHRoZSBhY3R1YWwgQ2xvdWRGb3JtYXRpb24gbG9naWNhbCBuYW1lXG4gICAgICAvLyBUcnkgd2l0aCByZXNvdXJjZU5hbWUgZmlyc3QgKG1vc3QgY29tbW9uKSwgdGhlbiB0cnkgd2l0aG91dCBhcmd1bWVudHNcbiAgICAgIGxldCBsb2dpY2FsTmFtZTogc3RyaW5nO1xuICAgICAgdHJ5IHtcbiAgICAgICAgbG9naWNhbE5hbWUgPSBsb2dpY2FsTmFtZUZuKHJlc291cmNlTmFtZSk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBsb2dpY2FsTmFtZSA9IGxvZ2ljYWxOYW1lRm4oKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgLy8gSWYgYm90aCBmYWlsLCB1c2UgcHJvcGVydHkgbmFtZSBhcy1pc1xuICAgICAgICAgIGxvZ2ljYWxOYW1lID0gcHJvcGVydHlOYW1lO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobG9naWNhbE5hbWUuaW5jbHVkZXMoJ3VuZGVmaW5lZCcpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvck1lc3NhZ2UucmVwbGFjZSgne3Byb3BlcnR5TmFtZX0nLCBwcm9wZXJ0eU5hbWUpKTtcbiAgICAgIH1cbiAgICAgIC8vIFdoZW4gdXNpbmcgU0RLIHByb3BlcnR5IG5hbWVzLCBmbGF0dGVuIG5lc3RlZCBvYmplY3RzIHRvIGRvdC1ub3RhdGlvblxuICAgICAgLy8gc28geyBTbXNDb25maWd1cmF0aW9uOiB7IEV4dGVybmFsSWQ6ICd4JyB9IH0gYmVjb21lcyB7ICdTbXNDb25maWd1cmF0aW9uLkV4dGVybmFsSWQnOiAneCcgfVxuICAgICAgY29uc3Qgb3ZlcnJpZGVWYWx1ZSA9IG92ZXJyaWRlc1twcm9wZXJ0eU5hbWVdO1xuICAgICAgaWYgKCF0cmFuc2Zvcm1lZE92ZXJyaWRlc1tsb2dpY2FsTmFtZV0pIHtcbiAgICAgICAgdHJhbnNmb3JtZWRPdmVycmlkZXNbbG9naWNhbE5hbWVdID0ge307XG4gICAgICB9XG4gICAgICBPYmplY3QuYXNzaWduKHRyYW5zZm9ybWVkT3ZlcnJpZGVzW2xvZ2ljYWxOYW1lXSwgZmxhdHRlblRvRG90Tm90YXRpb24ob3ZlcnJpZGVWYWx1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBub3QgZm91bmQgaW4gbWFwLCB1c2UgcHJvcGVydHkgbmFtZSBhcy1pcyAoQ0YgbG9naWNhbCBuYW1lIHVzZWQgZGlyZWN0bHkpXG4gICAgICAvLyBEb24ndCBmbGF0dGVuIC0gdXNlciBpcyB1c2luZyBDRiBsb2dpY2FsIG5hbWVzIGFuZCBtYXkgd2FudCBmdWxsIG9iamVjdCByZXBsYWNlbWVudFxuICAgICAgdHJhbnNmb3JtZWRPdmVycmlkZXNbcHJvcGVydHlOYW1lXSA9IG92ZXJyaWRlc1twcm9wZXJ0eU5hbWVdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cmFuc2Zvcm1lZE92ZXJyaWRlcztcbn1cblxuLyoqXG4gKiBUcmFuc2Zvcm0gdXNlci1mcmllbmRseSB0cmFuc2Zvcm1zICh3aXRoIHByb3BlcnR5IG5hbWVzIGxpa2UgJ2xhbWJkYScsICdsYW1iZGFMb2dHcm91cCcpXG4gKiB0byBDbG91ZEZvcm1hdGlvbiBsb2dpY2FsIG5hbWVzIHVzaW5nIGNmTG9naWNhbE5hbWVzXG4gKiBTaW1pbGFyIHRvIG92ZXJyaWRlcyBidXQgdGhlIHZhbHVlcyBhcmUgZnVuY3Rpb25zIGluc3RlYWQgb2Ygb2JqZWN0c1xuICovXG5mdW5jdGlvbiB0cmFuc2Zvcm1UcmFuc2Zvcm1zVG9Mb2dpY2FsTmFtZXMocmVzb3VyY2VOYW1lOiBzdHJpbmcsIHJlc291cmNlVHlwZTogc3RyaW5nLCB0cmFuc2Zvcm1zOiBhbnkpOiBhbnkge1xuICAvLyBHZXQgY2hpbGQgcmVzb3VyY2VzIGZvciB0aGlzIHJlc291cmNlIHR5cGVcbiAgY29uc3QgY2hpbGRSZXNvdXJjZXMgPSBDSElMRF9SRVNPVVJDRVNbcmVzb3VyY2VUeXBlXSB8fCBbXTtcblxuICAvLyBCdWlsZCBhIG1hcCBvZiBwcm9wZXJ0eSBuYW1lcyB0byBjaGlsZCByZXNvdXJjZXNcbiAgY29uc3QgcHJvcGVydHlOYW1lTWFwID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKTtcblxuICBmb3IgKGNvbnN0IGNoaWxkUmVzb3VyY2Ugb2YgY2hpbGRSZXNvdXJjZXMpIHtcbiAgICAvLyBUaGUgbG9naWNhbE5hbWUgZnVuY3Rpb24gaGFzIGEgbmFtZSBwcm9wZXJ0eSB0aGF0IG1hdGNoZXMgdGhlIHByb3BlcnR5IG5hbWVcbiAgICBpZiAoY2hpbGRSZXNvdXJjZS5sb2dpY2FsTmFtZSAmJiBjaGlsZFJlc291cmNlLmxvZ2ljYWxOYW1lLm5hbWUpIHtcbiAgICAgIHByb3BlcnR5TmFtZU1hcC5zZXQoY2hpbGRSZXNvdXJjZS5sb2dpY2FsTmFtZS5uYW1lLCBjaGlsZFJlc291cmNlKTtcbiAgICB9XG4gIH1cblxuICAvLyBUcmFuc2Zvcm0gdHJhbnNmb3JtcyBvYmplY3RcbiAgY29uc3QgdHJhbnNmb3JtZWRUcmFuc2Zvcm1zOiBhbnkgPSB7fTtcbiAgY29uc3QgZXJyb3JNZXNzYWdlID0gYFRyYW5zZm9ybSBvZiBwcm9wZXJ0eSB7cHJvcGVydHlOYW1lfSBvZiByZXNvdXJjZSAke3Jlc291cmNlTmFtZX0gaXMgbm90IHN1cHBvcnRlZC5cXG5cblJlbW92ZSB0aGUgdHJhbnNmb3JtLCBydW4gJ3N0YWNrdGFwZSBjb21waWxlOnRlbXBsYXRlJyBjb21tYW5kLCBhbmQgZmluZCB0aGUgbG9naWNhbCBuYW1lIG9mIHRoZSByZXNvdXJjZSB5b3Ugd2FudCB0byB0cmFuc2Zvcm0gbWFudWFsbHkuIFRoZW4gYWRkIGl0IHRvIHRoZSB0cmFuc2Zvcm1zIG9iamVjdC5gO1xuXG4gIGZvciAoY29uc3QgcHJvcGVydHlOYW1lIGluIHRyYW5zZm9ybXMpIHtcbiAgICBjb25zdCBjaGlsZFJlc291cmNlID0gcHJvcGVydHlOYW1lTWFwLmdldChwcm9wZXJ0eU5hbWUpO1xuXG4gICAgLy8gU2tpcCB1bnJlc29sdmFibGUgcmVzb3VyY2VzXG4gICAgaWYgKGNoaWxkUmVzb3VyY2U/LnVucmVzb2x2YWJsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yTWVzc2FnZS5yZXBsYWNlKCd7cHJvcGVydHlOYW1lfScsIHByb3BlcnR5TmFtZSkpO1xuICAgIH1cblxuICAgIGlmIChjaGlsZFJlc291cmNlKSB7XG4gICAgICBjb25zdCBsb2dpY2FsTmFtZUZuID0gY2hpbGRSZXNvdXJjZS5sb2dpY2FsTmFtZTtcbiAgICAgIC8vIENhbGwgdGhlIGNmTG9naWNhbE5hbWVzIGZ1bmN0aW9uIHRvIGdldCB0aGUgYWN0dWFsIENsb3VkRm9ybWF0aW9uIGxvZ2ljYWwgbmFtZVxuICAgICAgLy8gVHJ5IHdpdGggcmVzb3VyY2VOYW1lIGZpcnN0IChtb3N0IGNvbW1vbiksIHRoZW4gdHJ5IHdpdGhvdXQgYXJndW1lbnRzXG4gICAgICBsZXQgbG9naWNhbE5hbWU6IHN0cmluZztcbiAgICAgIHRyeSB7XG4gICAgICAgIGxvZ2ljYWxOYW1lID0gbG9naWNhbE5hbWVGbihyZXNvdXJjZU5hbWUpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbG9naWNhbE5hbWUgPSBsb2dpY2FsTmFtZUZuKCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIElmIGJvdGggZmFpbCwgdXNlIHByb3BlcnR5IG5hbWUgYXMtaXNcbiAgICAgICAgICBsb2dpY2FsTmFtZSA9IHByb3BlcnR5TmFtZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGxvZ2ljYWxOYW1lLmluY2x1ZGVzKCd1bmRlZmluZWQnKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNZXNzYWdlLnJlcGxhY2UoJ3twcm9wZXJ0eU5hbWV9JywgcHJvcGVydHlOYW1lKSk7XG4gICAgICB9XG4gICAgICB0cmFuc2Zvcm1lZFRyYW5zZm9ybXNbbG9naWNhbE5hbWVdID0gdHJhbnNmb3Jtc1twcm9wZXJ0eU5hbWVdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiBub3QgZm91bmQgaW4gbWFwLCB1c2UgcHJvcGVydHkgbmFtZSBhcy1pcyAoc2hvdWxkbid0IGhhcHBlbiB3aXRoIHByb3BlciB0eXBlcylcbiAgICAgIHRyYW5zZm9ybWVkVHJhbnNmb3Jtc1twcm9wZXJ0eU5hbWVdID0gdHJhbnNmb3Jtc1twcm9wZXJ0eU5hbWVdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cmFuc2Zvcm1lZFRyYW5zZm9ybXM7XG59XG5cbmV4cG9ydCB0eXBlIEdldENvbmZpZ1BhcmFtcyA9IHtcbiAgLyoqXG4gICAqIFByb2plY3QgbmFtZSB1c2VkIGZvciB0aGlzIG9wZXJhdGlvblxuICAgKi9cbiAgcHJvamVjdE5hbWU6IHN0cmluZztcbiAgLyoqXG4gICAqIFN0YWdlIChcImVudmlyb25tZW50XCIpIHVzZWQgZm9yIHRoaXMgb3BlcmF0aW9uXG4gICAqL1xuICBzdGFnZTogc3RyaW5nO1xuICAvKipcbiAgICogQVdTIHJlZ2lvbiB1c2VkIGZvciB0aGlzIG9wZXJhdGlvblxuICAgKiBUaGUgbGlzdCBvZiBhdmFpbGFibGUgcmVnaW9ucyBpcyBhdmFpbGFibGUgYXQgaHR0cHM6Ly93d3cuYXdzLXNlcnZpY2VzLmluZm8vcmVnaW9ucy5odG1sXG4gICAqL1xuICByZWdpb246IHN0cmluZztcbiAgLyoqXG4gICAqIExpc3Qgb2YgYXJndW1lbnRzIHBhc3NlZCB0byB0aGUgb3BlcmF0aW9uXG4gICAqL1xuICBjbGlBcmdzOiBTdGFja3RhcGVBcmdzO1xuICAvKipcbiAgICogU3RhY2t0YXBlIGNvbW1hbmQgdXNlZCB0byBwZXJmb3JtIHRoaXMgb3BlcmF0aW9uIChjYW4gYmUgZWl0aGVyIGRlcGxveSwgY29kZWJ1aWxkOmRlcGxveSwgZGVsZXRlLCBldGMuKVxuICAgKi9cbiAgY29tbWFuZDogc3RyaW5nO1xuICAvKipcbiAgICogTG9jYWxseS1jb25maWd1cmVkIEFXUyBwcm9maWxlIHVzZWQgdG8gZXhlY3V0ZSB0aGUgb3BlcmF0aW9uLlxuICAgKiBEb2Vzbid0IGFwcGx5IGlmIHlvdSBoYXZlIHlvdXIgQVdTIGFjY291bnQgY29ubmVjdGVkIGluIFwiYXV0b21hdGljXCIgbW9kZS5cbiAgICovXG4gIGF3c1Byb2ZpbGU6IHN0cmluZztcbiAgLyoqXG4gICAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSB1c2VyIHBlcmZvcm1pbmcgdGhlIHN0YWNrIG9wZXJhdGlvblxuICAgKi9cbiAgdXNlcjoge1xuICAgIGlkOiBzdHJpbmc7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGVtYWlsOiBzdHJpbmc7XG4gIH07XG59O1xuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiB0byBkZWZpbmUgYSBjb25maWcgd2l0aCBhdXRvbWF0aWMgdHJhbnNmb3JtYXRpb25cbiAqIFVzZSB0aGlzIHdoZW4gZXhwb3J0aW5nIHlvdXIgY29uZmlnIGZvciB0aGUgU3RhY2t0YXBlIENMSVxuICovXG5leHBvcnQgY29uc3QgZGVmaW5lQ29uZmlnID0gKGNvbmZpZ0ZuOiAocGFyYW1zOiBHZXRDb25maWdQYXJhbXMpID0+IFN0YWNrdGFwZUNvbmZpZykgPT4ge1xuICByZXR1cm4gKHBhcmFtczogR2V0Q29uZmlnUGFyYW1zKSA9PiB7XG4gICAgY29uc3QgY29uZmlnID0gY29uZmlnRm4ocGFyYW1zKTtcbiAgICByZXR1cm4gdHJhbnNmb3JtQ29uZmlnV2l0aFJlc291cmNlcyhjb25maWcpO1xuICB9O1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm1zIGEgY29uZmlnIHdpdGggcmVzb3VyY2UgaW5zdGFuY2VzIGludG8gYSBwbGFpbiBjb25maWcgb2JqZWN0XG4gKi9cbmV4cG9ydCBjb25zdCB0cmFuc2Zvcm1Db25maWdXaXRoUmVzb3VyY2VzID0gKGNvbmZpZzogYW55KTogYW55ID0+IHtcbiAgaWYgKCFjb25maWcgfHwgdHlwZW9mIGNvbmZpZyAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgLy8gRmlyc3QgcGFzczogc2V0IGFsbCByZXNvdXJjZSBuYW1lcyBmcm9tIG9iamVjdCBrZXlzXG4gIC8vIFRoaXMgbXVzdCBoYXBwZW4gYmVmb3JlIGFueSB0cmFuc2Zvcm1hdGlvbiBzbyB0aGF0IFJlc291cmNlUGFyYW1SZWZlcmVuY2VzIGNhbiByZXNvbHZlIG5hbWVzXG4gIGlmIChjb25maWcucmVzb3VyY2VzICYmIHR5cGVvZiBjb25maWcucmVzb3VyY2VzID09PSAnb2JqZWN0Jykge1xuICAgIGZvciAoY29uc3Qga2V5IGluIGNvbmZpZy5yZXNvdXJjZXMpIHtcbiAgICAgIGNvbnN0IHJlc291cmNlID0gY29uZmlnLnJlc291cmNlc1trZXldO1xuICAgICAgaWYgKGlzQmFzZVJlc291cmNlKHJlc291cmNlKSkge1xuICAgICAgICAocmVzb3VyY2UgYXMgYW55KVtzZXRSZXNvdXJjZU5hbWVTeW1ib2xdKGtleSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gU2Vjb25kIHBhc3M6IHRyYW5zZm9ybSB0aGUgY29uZmlnXG4gIGNvbnN0IHJlc3VsdDogYW55ID0ge307XG4gIGZvciAoY29uc3Qga2V5IGluIGNvbmZpZykge1xuICAgIGlmIChrZXkgPT09ICdyZXNvdXJjZXMnKSB7XG4gICAgICAvLyBSZXNvdXJjZXMgYXJlIHRyYW5zZm9ybWVkIGFzIGRlZmluaXRpb25zXG4gICAgICByZXN1bHRba2V5XSA9IHRyYW5zZm9ybVJlc291cmNlRGVmaW5pdGlvbnMoY29uZmlnW2tleV0pO1xuICAgIH0gZWxzZSBpZiAoa2V5ID09PSAnc2NyaXB0cycpIHtcbiAgICAgIC8vIFNjcmlwdHMgYXJlIGFsc28gdHJhbnNmb3JtZWQgYXMgZGVmaW5pdGlvbnNcbiAgICAgIHJlc3VsdFtrZXldID0gdHJhbnNmb3JtU2NyaXB0RGVmaW5pdGlvbnMoY29uZmlnW2tleV0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHRba2V5XSA9IHRyYW5zZm9ybVZhbHVlKGNvbmZpZ1trZXldKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtcyBlbnZpcm9ubWVudCBvYmplY3QgdG8gYXJyYXkgZm9ybWF0XG4gKi9cbmNvbnN0IHRyYW5zZm9ybUVudmlyb25tZW50ID0gKGVudjogYW55KTogYW55ID0+IHtcbiAgaWYgKCFlbnYgfHwgdHlwZW9mIGVudiAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShlbnYpKSB7XG4gICAgcmV0dXJuIGVudjtcbiAgfVxuXG4gIC8vIENvbnZlcnQgeyBLRVk6IHZhbHVlIH0gdG8gW3sgbmFtZTogJ0tFWScsIHZhbHVlIH1dXG4gIHJldHVybiBPYmplY3QuZW50cmllcyhlbnYpLm1hcCgoW25hbWUsIHZhbHVlXSkgPT4gKHtcbiAgICBuYW1lLFxuICAgIHZhbHVlOiB0cmFuc2Zvcm1WYWx1ZSh2YWx1ZSlcbiAgfSkpO1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm1zIHJlc291cmNlIGRlZmluaXRpb25zICh2YWx1ZXMgaW4gdGhlIHJlc291cmNlcyBvYmplY3QpXG4gKi9cbmNvbnN0IHRyYW5zZm9ybVJlc291cmNlRGVmaW5pdGlvbnMgPSAocmVzb3VyY2VzOiBhbnkpOiBhbnkgPT4ge1xuICBpZiAoIXJlc291cmNlcyB8fCB0eXBlb2YgcmVzb3VyY2VzICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiByZXNvdXJjZXM7XG4gIH1cblxuICBjb25zdCByZXN1bHQ6IGFueSA9IHt9O1xuICBmb3IgKGNvbnN0IGtleSBpbiByZXNvdXJjZXMpIHtcbiAgICBjb25zdCByZXNvdXJjZSA9IHJlc291cmNlc1trZXldO1xuICAgIGlmIChpc0Jhc2VSZXNvdXJjZShyZXNvdXJjZSkpIHtcbiAgICAgIGNvbnN0IHR5cGUgPSAocmVzb3VyY2UgYXMgYW55KVtnZXRUeXBlU3ltYm9sXSgpO1xuICAgICAgY29uc3QgcHJvcGVydGllcyA9IChyZXNvdXJjZSBhcyBhbnkpW2dldFByb3BlcnRpZXNTeW1ib2xdKCk7XG4gICAgICBjb25zdCBvdmVycmlkZXMgPSAocmVzb3VyY2UgYXMgYW55KVtnZXRPdmVycmlkZXNTeW1ib2xdKCk7XG4gICAgICBjb25zdCB0cmFuc2Zvcm1zID0gKHJlc291cmNlIGFzIGFueSlbZ2V0VHJhbnNmb3Jtc1N5bWJvbF0oKTtcbiAgICAgIHJlc3VsdFtrZXldID0ge1xuICAgICAgICB0eXBlLFxuICAgICAgICBwcm9wZXJ0aWVzOiB0cmFuc2Zvcm1WYWx1ZShwcm9wZXJ0aWVzKSxcbiAgICAgICAgLi4uKG92ZXJyaWRlcyAhPT0gdW5kZWZpbmVkICYmIHsgb3ZlcnJpZGVzOiB0cmFuc2Zvcm1WYWx1ZShvdmVycmlkZXMpIH0pLFxuICAgICAgICAuLi4odHJhbnNmb3JtcyAhPT0gdW5kZWZpbmVkICYmIHsgdHJhbnNmb3JtcyB9KVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0W2tleV0gPSB0cmFuc2Zvcm1WYWx1ZShyZXNvdXJjZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybXMgc2NyaXB0IGRlZmluaXRpb25zICh2YWx1ZXMgaW4gdGhlIHNjcmlwdHMgb2JqZWN0KVxuICovXG5jb25zdCB0cmFuc2Zvcm1TY3JpcHREZWZpbml0aW9ucyA9IChzY3JpcHRzOiBhbnkpOiBhbnkgPT4ge1xuICBpZiAoIXNjcmlwdHMgfHwgdHlwZW9mIHNjcmlwdHMgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIHNjcmlwdHM7XG4gIH1cblxuICBjb25zdCByZXN1bHQ6IGFueSA9IHt9O1xuICBmb3IgKGNvbnN0IGtleSBpbiBzY3JpcHRzKSB7XG4gICAgY29uc3Qgc2NyaXB0ID0gc2NyaXB0c1trZXldO1xuICAgIGlmIChpc0Jhc2VUeXBlUHJvcGVydGllcyhzY3JpcHQpKSB7XG4gICAgICByZXN1bHRba2V5XSA9IHtcbiAgICAgICAgdHlwZTogc2NyaXB0LnR5cGUsXG4gICAgICAgIHByb3BlcnRpZXM6IHRyYW5zZm9ybVZhbHVlKHNjcmlwdC5wcm9wZXJ0aWVzKVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0W2tleV0gPSB0cmFuc2Zvcm1WYWx1ZShzY3JpcHQpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuZXhwb3J0IGNvbnN0IHRyYW5zZm9ybVZhbHVlID0gKHZhbHVlOiBhbnkpOiBhbnkgPT4ge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgY29uc3QgcmV3cml0dGVuRGlyZWN0aXZlID0gcmV3cml0ZUVtYmVkZGVkRGlyZWN0aXZlc1RvQ2ZGb3JtYXQodmFsdWUpO1xuICAgIGlmIChyZXdyaXR0ZW5EaXJlY3RpdmUgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiByZXdyaXR0ZW5EaXJlY3RpdmU7XG4gICAgfVxuICB9XG5cbiAgLy8gVHJhbnNmb3JtIERlZmVycmVkUmVzb3VyY2VOYW1lIC0gcmVzb2x2ZSB0byBhY3R1YWwgbmFtZVxuICBpZiAoaXNEZWZlcnJlZFJlc291cmNlTmFtZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUucmVzb2x2ZSgpO1xuICB9XG5cbiAgLy8gVHJhbnNmb3JtIFJlc291cmNlUGFyYW1SZWZlcmVuY2VcbiAgaWYgKGlzUmVzb3VyY2VQYXJhbVJlZmVyZW5jZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgfVxuXG4gIC8vIFRyYW5zZm9ybSBCYXNlUmVzb3VyY2UgcmVmZXJlbmNlcyAobm90IGRlZmluaXRpb25zKSB0byByZXNvdXJjZU5hbWVcbiAgLy8gVGhpcyBoYW5kbGVzIGNhc2VzIGxpa2UgY29ubmVjdFRvOiBbZGF0YWJhc2VdXG4gIGlmIChpc0Jhc2VSZXNvdXJjZSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUucmVzb3VyY2VOYW1lO1xuICB9XG5cbiAgLy8gVHJhbnNmb3JtIEJhc2VUeXBlUHJvcGVydGllcyAoZW5naW5lcywgcGFja2FnaW5nLCBldmVudHMpIHRvIHBsYWluIG9iamVjdFxuICBpZiAoaXNCYXNlVHlwZVByb3BlcnRpZXModmFsdWUpKSB7XG4gICAgLy8gSGFuZGxlIHR5cGUtb25seSBjbGFzc2VzIChubyBwcm9wZXJ0aWVzKVxuICAgIGlmICghKCdwcm9wZXJ0aWVzJyBpbiB2YWx1ZSkgfHwgdmFsdWUucHJvcGVydGllcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4geyB0eXBlOiB2YWx1ZS50eXBlIH07XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiB2YWx1ZS50eXBlLFxuICAgICAgcHJvcGVydGllczogdHJhbnNmb3JtVmFsdWUodmFsdWUucHJvcGVydGllcylcbiAgICB9O1xuICB9XG5cbiAgLy8gVHJhbnNmb3JtIEFsYXJtIGNsYXNzIHRvIHBsYWluIG9iamVjdFxuICBpZiAoaXNBbGFybSh2YWx1ZSkpIHtcbiAgICBjb25zdCByZXN1bHQ6IGFueSA9IHtcbiAgICAgIHRyaWdnZXI6IHRyYW5zZm9ybVZhbHVlKHZhbHVlLnRyaWdnZXIpXG4gICAgfTtcbiAgICBpZiAodmFsdWUuZXZhbHVhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXN1bHQuZXZhbHVhdGlvbiA9IHRyYW5zZm9ybVZhbHVlKHZhbHVlLmV2YWx1YXRpb24pO1xuICAgIH1cbiAgICBpZiAodmFsdWUubm90aWZpY2F0aW9uVGFyZ2V0cyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXN1bHQubm90aWZpY2F0aW9uVGFyZ2V0cyA9IHRyYW5zZm9ybVZhbHVlKHZhbHVlLm5vdGlmaWNhdGlvblRhcmdldHMpO1xuICAgIH1cbiAgICBpZiAodmFsdWUuZGVzY3JpcHRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVzdWx0LmRlc2NyaXB0aW9uID0gdmFsdWUuZGVzY3JpcHRpb247XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBUcmFuc2Zvcm0gYXJyYXlzXG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS5tYXAoKGl0ZW0pID0+IHtcbiAgICAgIC8vIElmIGl0J3MgYSByZXNvdXJjZSBpbnN0YW5jZSBpbiBhbiBhcnJheSAoZS5nLiwgY29ubmVjdFRvKSwgdHJhbnNmb3JtIHRvIHJlc291cmNlTmFtZVxuICAgICAgaWYgKGlzQmFzZVJlc291cmNlKGl0ZW0pKSB7XG4gICAgICAgIHJldHVybiBpdGVtLnJlc291cmNlTmFtZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cmFuc2Zvcm1WYWx1ZShpdGVtKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFRyYW5zZm9ybSBvYmplY3RzXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgY29uc3QgcmVzdWx0OiBhbnkgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGtleSBpbiB2YWx1ZSkge1xuICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgZW52aXJvbm1lbnQgYW5kIGluamVjdEVudmlyb25tZW50IHByb3BlcnRpZXNcbiAgICAgIGlmIChrZXkgPT09ICdlbnZpcm9ubWVudCcgfHwga2V5ID09PSAnaW5qZWN0RW52aXJvbm1lbnQnKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdHJhbnNmb3JtRW52aXJvbm1lbnQodmFsdWVba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRba2V5XSA9IHRyYW5zZm9ybVZhbHVlKHZhbHVlW2tleV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuY29uc3QgUlVOVElNRV9ESVJFQ1RJVkVfTkFNRVMgPSBuZXcgU2V0KFsnUmVzb3VyY2VQYXJhbScsICdDZlJlc291cmNlUGFyYW0nLCAnU2VjcmV0JywgJ0NmRm9ybWF0JywgJ0NmU3RhY2tPdXRwdXQnXSk7XG5cbmNvbnN0IHJld3JpdGVFbWJlZGRlZERpcmVjdGl2ZXNUb0NmRm9ybWF0ID0gKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsID0+IHtcbiAgY29uc3QgZW1iZWRkZWREaXJlY3RpdmVzID0gZ2V0RW1iZWRkZWREaXJlY3RpdmVzKHZhbHVlKTtcbiAgaWYgKGVtYmVkZGVkRGlyZWN0aXZlcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmIChcbiAgICBlbWJlZGRlZERpcmVjdGl2ZXMubGVuZ3RoID09PSAxICYmXG4gICAgZW1iZWRkZWREaXJlY3RpdmVzWzBdLnN0YXJ0UG9zID09PSAwICYmXG4gICAgZW1iZWRkZWREaXJlY3RpdmVzWzBdLmVuZFBvcyA9PT0gdmFsdWUubGVuZ3RoXG4gICkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbGV0IGludGVycG9sYXRlZFN0cmluZyA9ICcnO1xuICBsZXQgY3VycmVudFBvcyA9IDA7XG4gIGVtYmVkZGVkRGlyZWN0aXZlcy5mb3JFYWNoKCh7IHN0YXJ0UG9zLCBlbmRQb3MgfSkgPT4ge1xuICAgIGludGVycG9sYXRlZFN0cmluZyArPSBgJHt2YWx1ZS5zbGljZShjdXJyZW50UG9zLCBzdGFydFBvcyl9e31gO1xuICAgIGN1cnJlbnRQb3MgPSBlbmRQb3M7XG4gIH0pO1xuICBpbnRlcnBvbGF0ZWRTdHJpbmcgKz0gdmFsdWUuc2xpY2UoY3VycmVudFBvcyk7XG5cbiAgY29uc3QgZXNjYXBlZEludGVycG9sYXRlZFN0cmluZyA9IGludGVycG9sYXRlZFN0cmluZ1xuICAgIC5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpXG4gICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgIC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJylcbiAgICAucmVwbGFjZSgvXFxuL2csICdcXFxcbicpXG4gICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcblxuICBjb25zdCBkaXJlY3RpdmVBcmdzID0gZW1iZWRkZWREaXJlY3RpdmVzLm1hcCgoeyBkZWZpbml0aW9uIH0pID0+IGRlZmluaXRpb24pLmpvaW4oJywgJyk7XG4gIGNvbnN0IGhhc1J1bnRpbWVEaXJlY3RpdmUgPSBlbWJlZGRlZERpcmVjdGl2ZXMuc29tZSgoeyBuYW1lIH0pID0+IFJVTlRJTUVfRElSRUNUSVZFX05BTUVTLmhhcyhuYW1lKSk7XG4gIGNvbnN0IGZvcm1hdERpcmVjdGl2ZU5hbWUgPSBoYXNSdW50aW1lRGlyZWN0aXZlID8gJ0NmRm9ybWF0JyA6ICdGb3JtYXQnO1xuICByZXR1cm4gYCQke2Zvcm1hdERpcmVjdGl2ZU5hbWV9KCcke2VzY2FwZWRJbnRlcnBvbGF0ZWRTdHJpbmd9JywgJHtkaXJlY3RpdmVBcmdzfSlgO1xufTtcblxuY29uc3QgZ2V0RW1iZWRkZWREaXJlY3RpdmVzID0gKFxuICB2YWx1ZTogc3RyaW5nXG4pOiBBcnJheTx7IGRlZmluaXRpb246IHN0cmluZzsgbmFtZTogc3RyaW5nOyBzdGFydFBvczogbnVtYmVyOyBlbmRQb3M6IG51bWJlciB9PiA9PiB7XG4gIGNvbnN0IGRpcmVjdGl2ZXM6IEFycmF5PHsgZGVmaW5pdGlvbjogc3RyaW5nOyBuYW1lOiBzdHJpbmc7IHN0YXJ0UG9zOiBudW1iZXI7IGVuZFBvczogbnVtYmVyIH0+ID0gW107XG5cbiAgY29uc3QgdHJ5UGFyc2VEaXJlY3RpdmVBdCA9IChcbiAgICBzdHI6IHN0cmluZyxcbiAgICBzdGFydFBvczogbnVtYmVyXG4gICk6IHsgZGVmaW5pdGlvbjogc3RyaW5nOyBuYW1lOiBzdHJpbmc7IGVuZFBvczogbnVtYmVyIH0gfCBudWxsID0+IHtcbiAgICBpZiAoc3RyW3N0YXJ0UG9zXSAhPT0gJyQnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgaWR4ID0gc3RhcnRQb3MgKyAxO1xuICAgIGNvbnN0IGZpcnN0TmFtZUNoYXIgPSBzdHJbaWR4XTtcbiAgICBpZiAoIWZpcnN0TmFtZUNoYXIgfHwgIWZpcnN0TmFtZUNoYXIubWF0Y2goL1tBLVpfXS9pKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgd2hpbGUgKGlkeCA8IHN0ci5sZW5ndGggJiYgc3RyW2lkeF0ubWF0Y2goL1tcXHckXS8pKSB7XG4gICAgICBpZHgrKztcbiAgICB9XG5cbiAgICBjb25zdCBuYW1lID0gc3RyLnNsaWNlKHN0YXJ0UG9zICsgMSwgaWR4KTtcblxuICAgIGlmIChzdHJbaWR4XSAhPT0gJygnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgZGVwdGggPSAwO1xuICAgIGxldCBpblNpbmdsZVF1b3RlID0gZmFsc2U7XG4gICAgbGV0IGluRG91YmxlUXVvdGUgPSBmYWxzZTtcbiAgICBsZXQgY2xvc2luZ1BhcmVuUG9zID0gLTE7XG5cbiAgICBmb3IgKGxldCBpID0gaWR4OyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjaGFyID0gc3RyW2ldO1xuICAgICAgY29uc3QgcHJldkNoYXIgPSBpID4gMCA/IHN0cltpIC0gMV0gOiAnJztcblxuICAgICAgaWYgKGNoYXIgPT09IFwiJ1wiICYmIHByZXZDaGFyICE9PSAnXFxcXCcgJiYgIWluRG91YmxlUXVvdGUpIHtcbiAgICAgICAgaW5TaW5nbGVRdW90ZSA9ICFpblNpbmdsZVF1b3RlO1xuICAgICAgfSBlbHNlIGlmIChjaGFyID09PSAnXCInICYmIHByZXZDaGFyICE9PSAnXFxcXCcgJiYgIWluU2luZ2xlUXVvdGUpIHtcbiAgICAgICAgaW5Eb3VibGVRdW90ZSA9ICFpbkRvdWJsZVF1b3RlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWluU2luZ2xlUXVvdGUgJiYgIWluRG91YmxlUXVvdGUpIHtcbiAgICAgICAgaWYgKGNoYXIgPT09ICcoJykge1xuICAgICAgICAgIGRlcHRoKys7XG4gICAgICAgIH0gZWxzZSBpZiAoY2hhciA9PT0gJyknKSB7XG4gICAgICAgICAgZGVwdGgtLTtcbiAgICAgICAgICBpZiAoZGVwdGggPT09IDApIHtcbiAgICAgICAgICAgIGNsb3NpbmdQYXJlblBvcyA9IGk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY2xvc2luZ1BhcmVuUG9zID09PSAtMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgbGV0IGVuZFBvcyA9IGNsb3NpbmdQYXJlblBvcyArIDE7XG4gICAgaWYgKHN0cltlbmRQb3NdID09PSAnLicpIHtcbiAgICAgIGVuZFBvcysrO1xuICAgICAgd2hpbGUgKGVuZFBvcyA8IHN0ci5sZW5ndGggJiYgc3RyW2VuZFBvc10ubWF0Y2goL1tcXHckXFwuXS8pKSB7XG4gICAgICAgIGVuZFBvcysrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBkZWZpbml0aW9uOiBzdHIuc2xpY2Uoc3RhcnRQb3MsIGVuZFBvcyksXG4gICAgICBuYW1lLFxuICAgICAgZW5kUG9zXG4gICAgfTtcbiAgfTtcblxuICBsZXQgaWR4ID0gMDtcbiAgd2hpbGUgKGlkeCA8IHZhbHVlLmxlbmd0aCkge1xuICAgIGlmICh2YWx1ZVtpZHhdID09PSAnJCcpIHtcbiAgICAgIGNvbnN0IHBhcnNlZCA9IHRyeVBhcnNlRGlyZWN0aXZlQXQodmFsdWUsIGlkeCk7XG4gICAgICBpZiAocGFyc2VkKSB7XG4gICAgICAgIGRpcmVjdGl2ZXMucHVzaCh7IGRlZmluaXRpb246IHBhcnNlZC5kZWZpbml0aW9uLCBuYW1lOiBwYXJzZWQubmFtZSwgc3RhcnRQb3M6IGlkeCwgZW5kUG9zOiBwYXJzZWQuZW5kUG9zIH0pO1xuICAgICAgICBpZHggPSBwYXJzZWQuZW5kUG9zO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWR4Kys7XG4gIH1cblxuICByZXR1cm4gZGlyZWN0aXZlcztcbn07XG4iLAogICAgIi8qKlxuICogUmV0dXJucyBhIHJlZmVyZW5jZSB0byBhIHJlc291cmNlIHBhcmFtZXRlci5cbiAqIEBwYXJhbSByZXNvdXJjZU5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgcmVzb3VyY2UgYXMgc3BlY2lmaWVkIGluIHRoZSBTdGFja3RhcGUgY29uZmlnLlxuICogQHBhcmFtIHByb3BlcnR5IC0gVGhlIHByb3BlcnR5IG9mIHRoZSByZXNvdXJjZS4gVGhlIGxpc3Qgb2YgcHJvcGVydGllcyBpcyBhdmFpbGFibGUgaW4gdGhlIFN0YWNrdGFwZSBkb2NzIGZvciBldmVyeSBnaXZlbiByZXNvdXJjZSB0eXBlLlxuICovXG5leHBvcnQgY29uc3QgJFJlc291cmNlUGFyYW0gPSAocmVzb3VyY2VOYW1lOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcpID0+IHtcbiAgcmV0dXJuIGAkUmVzb3VyY2VQYXJhbSgnJHtyZXNvdXJjZU5hbWV9JywnJHtwcm9wZXJ0eX0nKWA7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSByZWZlcmVuY2UgdG8gYSBDbG91ZEZvcm1hdGlvbiByZXNvdXJjZSBwYXJhbWV0ZXIuXG4gKiBAcGFyYW0gY2xvdWRmb3JtYXRpb25SZXNvdXJjZUxvZ2ljYWxJZCAtIFRoZSBsb2dpY2FsIG5hbWUgb2YgdGhlIENsb3VkZm9ybWF0aW9uIHJlc291cmNlLlxuICogSWYgeW91IGFyZSByZWZlcmVuY2luZyBhIHJlc291cmNlIGRlZmluZWQgaW4gdGhlIGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VzIHNlY3Rpb24sIHVzZSBpdHMgbmFtZS5cbiAqIFRvIHJlZmVyZW5jZSBhIGNoaWxkIHJlc291cmNlIG9mIGEgU3RhY2t0YXBlIHJlc291cmNlLCB5b3UgY2FuIGdldCBhIGxpc3Qgb2YgY2hpbGQgcmVzb3VyY2VzIHdpdGggdGhlIGBzdGFja3RhcGUgc3RhY2staW5mb2AgY29tbWFuZFxuICogQHBhcmFtIHByb3BlcnR5IC0gVGhlIHBhcmFtZXRlciBvZiB0aGUgQ2xvdWRmb3JtYXRpb24gcmVzb3VyY2UgdG8gcmVmZXJlbmNlLlxuICogRm9yIGEgbGlzdCBvZiBhbGwgcmVmZXJlbmNlYWJsZSBwYXJhbWV0ZXJzLCByZWZlciB0byB0aGUgW1JlZmVyZW5jaW5nIHBhcmFtZXRlcnNdKGh0dHBzOi8vZG9jcy5zdGFja3RhcGUuY29tL2NvbmZpZ3VyYXRpb24vcmVmZXJlbmNpbmctcGFyYW1ldGVycyNwYXJhbWV0ZXJzLW9mLWNsb3VkZm9ybWF0aW9uLXJlc291cmNlcykgc2VjdGlvbiBpbiB0aGUgU3RhY2t0YXBlIGRvY3MuXG4gKi9cbmV4cG9ydCBjb25zdCAkQ2ZSZXNvdXJjZVBhcmFtID0gKGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VMb2dpY2FsSWQ6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZykgPT4ge1xuICByZXR1cm4gYCRDZlJlc291cmNlUGFyYW0oJyR7Y2xvdWRmb3JtYXRpb25SZXNvdXJjZUxvZ2ljYWxJZH0nLCcke3Byb3BlcnR5fScpYDtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIHJlZmVyZW5jZSB0byBhIHNlY3JldC5cbiAqIEBwYXJhbSBzZWNyZXROYW1lIC0gVGhlIG5hbWUgb2YgdGhlIHNlY3JldC4gTXVzdCBiZSBhIHZhbGlkIHNlY3JldCBuYW1lIGluIHRoZSBBV1MgU2VjcmV0cyBNYW5hZ2VyIGluIHRoZSByZWdpb24geW91J3JlIGRlcGxveWluZyB0by5cbiAqIElmIHRoZSBzZWNyZXQgaXMgaW4gSlNPTiBmb3JtYXQsIHlvdSBjYW4gZXh0cmFjdCBuZXN0ZWQgcHJvcGVydGllcyB1c2luZyBkb3Qgbm90YXRpb24uXG4gKiBFeGFtcGxlOiBgJFNlY3JldCgnbXktc2VjcmV0LmFwaS1rZXknKWAgd2lsbCByZXR1cm4gdGhlIHZhbHVlIG9mIHRoZSBgYXBpLWtleWAgcHJvcGVydHkgaW4gdGhlIGBteS1zZWNyZXRgIHNlY3JldC5cbiAqL1xuZXhwb3J0IGNvbnN0ICRTZWNyZXQgPSAoc2VjcmV0TmFtZTogc3RyaW5nKSA9PiB7XG4gIHJldHVybiBgJFNlY3JldCgnJHtzZWNyZXROYW1lfScpYDtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIHJlZmVyZW5jZSB0byBhbiBTU00gUGFyYW1ldGVyIFN0b3JlIHBhcmFtZXRlci5cbiAqIEBwYXJhbSBwYXJhbU5hbWUgLSBUaGUgbmFtZSAob3IgcGF0aCkgb2YgdGhlIFNTTSBwYXJhbWV0ZXIuIE11c3QgZXhpc3QgaW4gdGhlIEFXUyBTeXN0ZW1zIE1hbmFnZXIgUGFyYW1ldGVyIFN0b3JlIGluIHRoZSByZWdpb24geW91J3JlIGRlcGxveWluZyB0by5cbiAqIFN1cHBvcnRzIGJvdGggYFN0cmluZ2AgYW5kIGBTZWN1cmVTdHJpbmdgIHBhcmFtZXRlciB0eXBlcyAoYXV0by1kZXRlY3RlZCkuXG4gKiBFeGFtcGxlOiBgJFNzbVBhcmFtKCdteS1hcGkta2V5JylgIG9yIGAkU3NtUGFyYW0oJy9wcm9kL2RhdGFiYXNlL2hvc3QnKWBcbiAqL1xuZXhwb3J0IGNvbnN0ICRTc21QYXJhbSA9IChwYXJhbU5hbWU6IHN0cmluZykgPT4ge1xuICByZXR1cm4gYCRTc21QYXJhbSgnJHtwYXJhbU5hbWV9JylgO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIGludGVycG9sYXRlZCBzdHJpbmcuIFVubGlrZSB0aGUgJEZvcm1hdCgpIGRpcmVjdGl2ZSwgdGhlICRDZkZvcm1hdCgpIGRpcmVjdGl2ZSBjYW4gY29udGFpbiBydW50aW1lLXJlc29sdmVkIGRpcmVjdGl2ZXMgYXMgYXJndW1lbnRzLlxuICogQHBhcmFtIGludGVycG9sYXRlZFN0cmluZyAtIE9jY3VycmVuY2VzIG9mIHt9IGFyZSByZXBsYWNlZCBieSB0aGUgc3Vic2VxdWVudCBhcmd1bWVudHMuXG4gKiBAcGFyYW0gdmFsdWVzIC0gVGhlIG51bWJlciBvZiB2YWx1ZXMgbXVzdCBiZSBlcXVhbCB0byB0aGUgbnVtYmVyIG9mIHt9IHBsYWNlaG9sZGVycyBpbiB0aGUgZmlyc3QgYXJndW1lbnQuXG4gKiBFeGFtcGxlOlxuICogYCRDZkZvcm1hdCgne30te30nLCAnZm9vJywgJ2JhcicpYCByZXN1bHRzIGluIGBmb28tYmFyYC5cbiAqICRDZkZvcm1hdCgne30tbXlkb21haW4uY29tJywgJ2ZvbycpIHJlc3VsdHMgaW4gZm9vLW15ZG9tYWluLmNvbS5cbiAqIGAkQ2ZGb3JtYXQoJ3t9Lm15ZG9tYWluLmNvbScsICRTdGFnZSgpKWAgcmVzdWx0cyBpbiBgc3RhZ2luZy5teWRvbWFpbi5jb21gIGlmIHRoZSBzdGFnZSBpcyBzdGFnaW5nLlxuICovXG5leHBvcnQgY29uc3QgJENmRm9ybWF0ID0gKGludGVycG9sYXRlZFN0cmluZzogc3RyaW5nLCAuLi52YWx1ZXM6IGFueVtdKSA9PiB7XG4gIHJldHVybiBgJENmRm9ybWF0KCcke2ludGVycG9sYXRlZFN0cmluZ30nLCAnJHt2YWx1ZXMuam9pbignLCcpfScpYDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgb3V0cHV0IG9mIGFub3RoZXIgc3RhY2ssIGFsbG93aW5nIHlvdSB0byByZWZlcmVuY2UgcmVzb3VyY2VzIGRlcGxveWVkIGluIGFub3RoZXIgc3RhY2suIFRoZSByZWZlcmVuY2VkIHN0YWNrIG11c3QgYWxyZWFkeSBiZSBkZXBsb3llZC4gSWYgeW91IHRyeSB0byBkZWxldGUgYSBzdGFjayB0aGF0IGlzIHJlZmVyZW5jZWQgYnkgYW5vdGhlciBzdGFjaywgeW91IHdpbGwgZ2V0IGFuIGVycm9yLlxuICogVG8gZ2V0IHRoZSBvdXRwdXQgbG9jYWxseSAoaS5lLiwgZG93bmxvYWQgdGhlIHZhbHVlIGFuZCBwYXNzIGl0IHRvIHRoZSBjb25maWd1cmF0aW9uKSwgdXNlIHRoZSAkU3RhY2tPdXRwdXQoKSBkaXJlY3RpdmUuXG4gKiBAcGFyYW0gc3RhY2tOYW1lIC0gVGhlIG5hbWUgb2YgdGhlIHN0YWNrLlxuICogQHBhcmFtIG91dHB1dE5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgb3V0cHV0LlxuICovXG5leHBvcnQgY29uc3QgJENmU3RhY2tPdXRwdXQgPSAoc3RhY2tOYW1lOiBzdHJpbmcsIG91dHB1dE5hbWU6IHN0cmluZykgPT4ge1xuICByZXR1cm4gYCRDZlN0YWNrT3V0cHV0KCcke3N0YWNrTmFtZX0nLCcke291dHB1dE5hbWV9JylgO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IEdpdCByZXBvc2l0b3J5LlxuICpcbiAqICRHaXRJbmZvKCkuc2hhMSAtIFNIQS0xIG9mIHRoZSBsYXRlc3QgY29tbWl0XG4gKlxuICogJEdpdEluZm8oKS5jb21taXQgLSBUaGUgbGF0ZXN0IGNvbW1pdCBJRFxuICpcbiAqICRHaXRJbmZvKCkuYnJhbmNoIC0gVGhlIG5hbWUgb2YgdGhlIGN1cnJlbnQgYnJhbmNoXG4gKlxuICogJEdpdEluZm8oKS5tZXNzYWdlIC0gVGhlIG1lc3NhZ2Ugb2YgdGhlIGxhc3QgY29tbWl0XG4gKlxuICogJEdpdEluZm8oKS51c2VyIC0gR2l0IHVzZXIncyBuYW1lXG4gKlxuICogJEdpdEluZm8oKS5lbWFpbCAtIEdpdCB1c2VyJ3MgZW1haWxcbiAqXG4gKiAkR2l0SW5mbygpLnJlcG9zaXRvcnkgLSBUaGUgbmFtZSBvZiB0aGUgZ2l0IHJlcG9zaXRvcnlcbiAqXG4gKiAkR2l0SW5mbygpLnRhZ3MgLSBUaGUgdGFncyBwb2ludGluZyB0byB0aGUgY3VycmVudCBjb21taXRcbiAqXG4gKiAkR2l0SW5mbygpLmRlc2NyaWJlIC0gVGhlIG1vc3QgcmVjZW50IHRhZyB0aGF0IGlzIHJlYWNoYWJsZSBmcm9tIGEgY29tbWl0XG4gKi9cbmV4cG9ydCBjb25zdCAkR2l0SW5mbyA9ICgpID0+IHtcbiAgcmV0dXJuICckR2l0SW5mbygpJztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgY3VycmVudCBBV1MgcmVnaW9uIHdoZXJlIHRoZSBzdGFjayBpcyBiZWluZyBkZXBsb3llZC5cbiAqIEV4YW1wbGU6IGB1cy1lYXN0LTFgXG4gKi9cbmV4cG9ydCBjb25zdCAkUmVnaW9uID0gKCkgPT4ge1xuICByZXR1cm4gJyRSZWdpb24oKSc7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGN1cnJlbnQgc3RhZ2UgbmFtZS5cbiAqIEV4YW1wbGU6IGBwcm9kdWN0aW9uYCwgYHN0YWdpbmdgLCBgZGV2YFxuICovXG5leHBvcnQgY29uc3QgJFN0YWdlID0gKCkgPT4ge1xuICByZXR1cm4gJyRTdGFnZSgpJztcbn07XG4iLAogICAgIi8qKlxuICogQVdTIFNFUyAoU2ltcGxlIEVtYWlsIFNlcnZpY2UpIHJlZmVyZW5jZSBmb3IgY29ubmVjdFRvXG4gKiBHcmFudHMgZnVsbCBwZXJtaXNzaW9ucyBmb3IgQVdTIFNFUyAoc2VzOiopXG4gKi9cbmV4cG9ydCBjb25zdCBBV1NfU0VTID0gJ2F3czpzZXMnIGFzIGNvbnN0O1xuXG4vKipcbiAqIFR5cGUgdGhhdCByZXByZXNlbnRzIGFueSBBV1Mgc2VydmljZSBjb25zdGFudFxuICovXG5leHBvcnQgdHlwZSBHbG9iYWxBd3NTZXJ2aWNlQ29uc3RhbnQgPSB0eXBlb2YgQVdTX1NFUztcbiIsCiAgICAiLyoqXG4gKiBUaGlzIGZpbGUgZGVmaW5lcyB0eXBlLXByb3BlcnRpZXMgc2hhcGVkIGRlZmluaXRpb25zIChlLmcuIFN0YWNrdGFwZSByZXNvdXJjZXMsIHBhY2thZ2luZyB0eXBlcyBldGMuKVxuICogdGhhdCBjYW4gYmUgY29udmVydGVkIHRvIGEgVHlwZXNjcmlwdCBjbGFzcy4gVGhlc2UgY2xhc3NlcyBhcmUgdGhlbiBleHBvcnRlZCBmcm9tIHN0YWNrdGFwZS9jbGFzc2VzXG4gKlxuICogQGV4YW1wbGUgaW1wb3J0IHsgU3RhY2t0YXBlTGFtYmRhQnVpbGRwYWNrUGFja2FnaW5nIH0gZnJvbSAnc3RhY2t0YXBlL2NsYXNzZXMnO1xuICovXG5cbmV4cG9ydCB0eXBlIFJlc291cmNlQ2xhc3NOYW1lID0gT21pdDxLZWJhYlRvUGFzY2FsQ2FzZTxTdHBSZXNvdXJjZVR5cGU+LCAnRnVuY3Rpb24nPiB8ICdMYW1iZGFGdW5jdGlvbic7XG5cbmV4cG9ydCB0eXBlIFJlc291cmNlRGVmaW5pdGlvbiA9IHtcbiAgLyoqIENsYXNzIG5hbWUgZm9yIHRoZSByZXNvdXJjZSAoZS5nLiwgJ0xhbWJkYUZ1bmN0aW9uJykgKi9cbiAgY2xhc3NOYW1lOiBSZXNvdXJjZUNsYXNzTmFtZTtcbiAgLyoqIFJlc291cmNlIHR5cGUgaWRlbnRpZmllciB1c2VkIGluIGNvbmZpZyAoZS5nLiwgJ2Z1bmN0aW9uJykgKi9cbiAgcmVzb3VyY2VUeXBlOiBzdHJpbmc7XG4gIC8qKiBQcm9wcyB0eXBlIG5hbWUgKGUuZy4sICdMYW1iZGFGdW5jdGlvblByb3BzJykgKi9cbiAgcHJvcHNUeXBlOiBzdHJpbmc7XG4gIC8qKiBJbnRlcmZhY2UgbmFtZSBpbiB0aGUgc291cmNlIC5kLnRzIGZpbGUgKGUuZy4sICdMYW1iZGFGdW5jdGlvbicpICovXG4gIGludGVyZmFjZU5hbWU6IHN0cmluZztcbiAgLyoqIFNvdXJjZSAuZC50cyBmaWxlIG5hbWUgKGUuZy4sICdmdW5jdGlvbnMuZC50cycpICovXG4gIHNvdXJjZUZpbGU6IHN0cmluZztcbiAgLyoqIFJlc291cmNlcyBhbmQgQVdTIHNlcnZpY2VzIHRoaXMgcmVzb3VyY2UgY2FuIGNvbm5lY3QgdG8uIEdsb2JhbEF3c1NlcnZpY2VDb25zdGFudCBpcyBmb3IgZ2xvYmFsIHNlcnZpY2VzLCBlLmcuIGF3czpzZXMgICovXG4gIGNhbkNvbm5lY3RUbz86IHN0cmluZ1tdO1xuICAvKiogV2hldGhlciB0aGlzIHJlc291cmNlIHN1cHBvcnRzIG92ZXJyaWRlcyAoZGVmYXVsdDogdHJ1ZSkgKi9cbiAgc3VwcG9ydHNPdmVycmlkZXM/OiBib29sZWFuO1xuICAvKiogV2hldGhlciB0aGlzIHJlc291cmNlIGhhcyBhdWdtZW50ZWQgY29ubmVjdFRvL2Vudmlyb25tZW50IHByb3BzIChkZWZhdWx0OiBmYWxzZSkgKi9cbiAgaGFzQXVnbWVudGVkUHJvcHM/OiBib29sZWFuO1xufTtcblxuLyoqXG4gKiBDb21wbGV0ZSBsaXN0IG9mIGFsbCBTdGFja3RhcGUgcmVzb3VyY2VzLlxuICogVGhpcyBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCAtIGFsbCBjb2RlIGdlbmVyYXRpb24gZGVyaXZlcyBmcm9tIHRoaXMuXG4gKi9cbmV4cG9ydCBjb25zdCBSRVNPVVJDRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUzogUmVzb3VyY2VEZWZpbml0aW9uW10gPSBbXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgIHJlc291cmNlVHlwZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2UnLFxuICAgIHByb3BzVHlwZTogJ1JlbGF0aW9uYWxEYXRhYmFzZVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnV2ViU2VydmljZScsXG4gICAgcmVzb3VyY2VUeXBlOiAnd2ViLXNlcnZpY2UnLFxuICAgIHByb3BzVHlwZTogJ1dlYlNlcnZpY2VQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1dlYlNlcnZpY2UnLFxuICAgIHNvdXJjZUZpbGU6ICd3ZWItc2VydmljZXMuZC50cycsXG4gICAgaGFzQXVnbWVudGVkUHJvcHM6IHRydWUsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJyxcbiAgICAgICdQcml2YXRlU2VydmljZSdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdQcml2YXRlU2VydmljZScsXG4gICAgcmVzb3VyY2VUeXBlOiAncHJpdmF0ZS1zZXJ2aWNlJyxcbiAgICBwcm9wc1R5cGU6ICdQcml2YXRlU2VydmljZVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUHJpdmF0ZVNlcnZpY2UnLFxuICAgIHNvdXJjZUZpbGU6ICdwcml2YXRlLXNlcnZpY2VzLmQudHMnLFxuICAgIGhhc0F1Z21lbnRlZFByb3BzOiB0cnVlLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbSdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdXb3JrZXJTZXJ2aWNlJyxcbiAgICByZXNvdXJjZVR5cGU6ICd3b3JrZXItc2VydmljZScsXG4gICAgcHJvcHNUeXBlOiAnV29ya2VyU2VydmljZVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnV29ya2VyU2VydmljZScsXG4gICAgc291cmNlRmlsZTogJ3dvcmtlci1zZXJ2aWNlcy5kLnRzJyxcbiAgICBoYXNBdWdtZW50ZWRQcm9wczogdHJ1ZSxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTXVsdGlDb250YWluZXJXb3JrbG9hZCcsXG4gICAgcmVzb3VyY2VUeXBlOiAnbXVsdGktY29udGFpbmVyLXdvcmtsb2FkJyxcbiAgICBwcm9wc1R5cGU6ICdDb250YWluZXJXb3JrbG9hZFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTXVsdGlDb250YWluZXJXb3JrbG9hZCcsXG4gICAgc291cmNlRmlsZTogJ211bHRpLWNvbnRhaW5lci13b3JrbG9hZHMuZC50cycsXG4gICAgaGFzQXVnbWVudGVkUHJvcHM6IHRydWUsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJyxcbiAgICAgICdMYW1iZGFGdW5jdGlvbicsXG4gICAgICAnQmF0Y2hKb2InLFxuICAgICAgJ1VzZXJBdXRoUG9vbCdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdMYW1iZGFGdW5jdGlvbicsXG4gICAgcmVzb3VyY2VUeXBlOiAnZnVuY3Rpb24nLFxuICAgIHByb3BzVHlwZTogJ0xhbWJkYUZ1bmN0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdMYW1iZGFGdW5jdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2Z1bmN0aW9ucy5kLnRzJyxcbiAgICBoYXNBdWdtZW50ZWRQcm9wczogdHJ1ZSxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nLFxuICAgICAgJ1ByaXZhdGVTZXJ2aWNlJyxcbiAgICAgICdXZWJTZXJ2aWNlJyxcbiAgICAgICdMYW1iZGFGdW5jdGlvbicsXG4gICAgICAnQmF0Y2hKb2InLFxuICAgICAgJ1VzZXJBdXRoUG9vbCdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdCYXRjaEpvYicsXG4gICAgcmVzb3VyY2VUeXBlOiAnYmF0Y2gtam9iJyxcbiAgICBwcm9wc1R5cGU6ICdCYXRjaEpvYlByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQmF0Y2hKb2InLFxuICAgIHNvdXJjZUZpbGU6ICdiYXRjaC1qb2JzLmQudHMnLFxuICAgIGhhc0F1Z21lbnRlZFByb3BzOiB0cnVlLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbSdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdCdWNrZXQnLFxuICAgIHJlc291cmNlVHlwZTogJ2J1Y2tldCcsXG4gICAgcHJvcHNUeXBlOiAnQnVja2V0UHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdCdWNrZXQnLFxuICAgIHNvdXJjZUZpbGU6ICdidWNrZXRzLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0hvc3RpbmdCdWNrZXQnLFxuICAgIHJlc291cmNlVHlwZTogJ2hvc3RpbmctYnVja2V0JyxcbiAgICBwcm9wc1R5cGU6ICdIb3N0aW5nQnVja2V0UHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdIb3N0aW5nQnVja2V0JyxcbiAgICBzb3VyY2VGaWxlOiAnaG9zdGluZy1idWNrZXRzLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0R5bmFtb0RiVGFibGUnLFxuICAgIHJlc291cmNlVHlwZTogJ2R5bmFtby1kYi10YWJsZScsXG4gICAgcHJvcHNUeXBlOiAnRHluYW1vRGJUYWJsZVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnRHluYW1vRGJUYWJsZScsXG4gICAgc291cmNlRmlsZTogJ2R5bmFtby1kYi10YWJsZXMuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnRXZlbnRCdXMnLFxuICAgIHJlc291cmNlVHlwZTogJ2V2ZW50LWJ1cycsXG4gICAgcHJvcHNUeXBlOiAnRXZlbnRCdXNQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0V2ZW50QnVzJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnQtYnVzZXMuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnSHR0cEFwaUdhdGV3YXknLFxuICAgIHJlc291cmNlVHlwZTogJ2h0dHAtYXBpLWdhdGV3YXknLFxuICAgIHByb3BzVHlwZTogJ0h0dHBBcGlHYXRld2F5UHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdIdHRwQXBpR2F0ZXdheScsXG4gICAgc291cmNlRmlsZTogJ2h0dHAtYXBpLWdhdGV3YXlzLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyJyxcbiAgICByZXNvdXJjZVR5cGU6ICdhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyJyxcbiAgICBwcm9wc1R5cGU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2Vycy5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdOZXR3b3JrTG9hZEJhbGFuY2VyJyxcbiAgICByZXNvdXJjZVR5cGU6ICduZXR3b3JrLWxvYWQtYmFsYW5jZXInLFxuICAgIHByb3BzVHlwZTogJ05ldHdvcmtMb2FkQmFsYW5jZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ05ldHdvcmtMb2FkQmFsYW5jZXInLFxuICAgIHNvdXJjZUZpbGU6ICduZXR3b3JrLWxvYWQtYmFsYW5jZXIuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmVkaXNDbHVzdGVyJyxcbiAgICByZXNvdXJjZVR5cGU6ICdyZWRpcy1jbHVzdGVyJyxcbiAgICBwcm9wc1R5cGU6ICdSZWRpc0NsdXN0ZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1JlZGlzQ2x1c3RlcicsXG4gICAgc291cmNlRmlsZTogJ3JlZGlzLWNsdXN0ZXIuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgcmVzb3VyY2VUeXBlOiAnbW9uZ28tZGItYXRsYXMtY2x1c3RlcicsXG4gICAgcHJvcHNUeXBlOiAnTW9uZ29EYkF0bGFzQ2x1c3RlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgc291cmNlRmlsZTogJ21vbmdvLWRiLWF0bGFzLWNsdXN0ZXJzLmQudHMnLFxuICAgIHN1cHBvcnRzT3ZlcnJpZGVzOiBmYWxzZSxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTdGF0ZU1hY2hpbmUnLFxuICAgIHJlc291cmNlVHlwZTogJ3N0YXRlLW1hY2hpbmUnLFxuICAgIHByb3BzVHlwZTogJ1N0YXRlTWFjaGluZVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU3RhdGVNYWNoaW5lJyxcbiAgICBzb3VyY2VGaWxlOiAnc3RhdGUtbWFjaGluZXMuZC50cycsXG4gICAgaGFzQXVnbWVudGVkUHJvcHM6IHRydWUsXG4gICAgY2FuQ29ubmVjdFRvOiBbJ0Z1bmN0aW9uJywgJ0JhdGNoSm9iJ11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1VzZXJBdXRoUG9vbCcsXG4gICAgcmVzb3VyY2VUeXBlOiAndXNlci1hdXRoLXBvb2wnLFxuICAgIHByb3BzVHlwZTogJ1VzZXJBdXRoUG9vbFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnVXNlckF1dGhQb29sJyxcbiAgICBzb3VyY2VGaWxlOiAndXNlci1wb29scy5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdVcHN0YXNoUmVkaXMnLFxuICAgIHJlc291cmNlVHlwZTogJ3Vwc3Rhc2gtcmVkaXMnLFxuICAgIHByb3BzVHlwZTogJ1Vwc3Rhc2hSZWRpc1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnVXBzdGFzaFJlZGlzJyxcbiAgICBzb3VyY2VGaWxlOiAndXBzdGFzaC1yZWRpcy5kLnRzJyxcbiAgICBzdXBwb3J0c092ZXJyaWRlczogZmFsc2UsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnU3FzUXVldWUnLFxuICAgIHJlc291cmNlVHlwZTogJ3Nxcy1xdWV1ZScsXG4gICAgcHJvcHNUeXBlOiAnU3FzUXVldWVQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Nxc1F1ZXVlJyxcbiAgICBzb3VyY2VGaWxlOiAnc3FzLXF1ZXVlcy5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTbnNUb3BpYycsXG4gICAgcmVzb3VyY2VUeXBlOiAnc25zLXRvcGljJyxcbiAgICBwcm9wc1R5cGU6ICdTbnNUb3BpY1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU25zVG9waWMnLFxuICAgIHNvdXJjZUZpbGU6ICdzbnMtdG9waWMuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnS2luZXNpc1N0cmVhbScsXG4gICAgcmVzb3VyY2VUeXBlOiAna2luZXNpcy1zdHJlYW0nLFxuICAgIHByb3BzVHlwZTogJ0tpbmVzaXNTdHJlYW1Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0tpbmVzaXNTdHJlYW0nLFxuICAgIHNvdXJjZUZpbGU6ICdraW5lc2lzLXN0cmVhbXMuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnV2ViQXBwRmlyZXdhbGwnLFxuICAgIHJlc291cmNlVHlwZTogJ3dlYi1hcHAtZmlyZXdhbGwnLFxuICAgIHByb3BzVHlwZTogJ1dlYkFwcEZpcmV3YWxsUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdXZWJBcHBGaXJld2FsbCcsXG4gICAgc291cmNlRmlsZTogJ3dlYi1hcHAtZmlyZXdhbGwuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgcmVzb3VyY2VUeXBlOiAnb3Blbi1zZWFyY2gtZG9tYWluJyxcbiAgICBwcm9wc1R5cGU6ICdPcGVuU2VhcmNoRG9tYWluUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICBzb3VyY2VGaWxlOiAnb3Blbi1zZWFyY2guZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnRWZzRmlsZXN5c3RlbScsXG4gICAgcmVzb3VyY2VUeXBlOiAnZWZzLWZpbGVzeXN0ZW0nLFxuICAgIHByb3BzVHlwZTogJ0Vmc0ZpbGVzeXN0ZW1Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0Vmc0ZpbGVzeXN0ZW0nLFxuICAgIHNvdXJjZUZpbGU6ICdlZnMtZmlsZXN5c3RlbS5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdOZXh0anNXZWInLFxuICAgIHJlc291cmNlVHlwZTogJ25leHRqcy13ZWInLFxuICAgIHByb3BzVHlwZTogJ05leHRqc1dlYlByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTmV4dGpzV2ViJyxcbiAgICBzb3VyY2VGaWxlOiAnbmV4dGpzLXdlYi5kLnRzJyxcbiAgICBoYXNBdWdtZW50ZWRQcm9wczogdHJ1ZSxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nLFxuICAgICAgJ1ByaXZhdGVTZXJ2aWNlJyxcbiAgICAgICdXZWJTZXJ2aWNlJyxcbiAgICAgICdMYW1iZGFGdW5jdGlvbicsXG4gICAgICAnQmF0Y2hKb2InLFxuICAgICAgJ1VzZXJBdXRoUG9vbCdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBc3Ryb1dlYicsXG4gICAgcmVzb3VyY2VUeXBlOiAnYXN0cm8td2ViJyxcbiAgICBwcm9wc1R5cGU6ICdBc3Ryb1dlYlByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXN0cm9XZWInLFxuICAgIHNvdXJjZUZpbGU6ICdhc3Ryby13ZWIuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJyxcbiAgICAgICdQcml2YXRlU2VydmljZScsXG4gICAgICAnV2ViU2VydmljZScsXG4gICAgICAnTGFtYmRhRnVuY3Rpb24nLFxuICAgICAgJ0JhdGNoSm9iJyxcbiAgICAgICdVc2VyQXV0aFBvb2wnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTnV4dFdlYicsXG4gICAgcmVzb3VyY2VUeXBlOiAnbnV4dC13ZWInLFxuICAgIHByb3BzVHlwZTogJ051eHRXZWJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ051eHRXZWInLFxuICAgIHNvdXJjZUZpbGU6ICdudXh0LXdlYi5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nLFxuICAgICAgJ1ByaXZhdGVTZXJ2aWNlJyxcbiAgICAgICdXZWJTZXJ2aWNlJyxcbiAgICAgICdMYW1iZGFGdW5jdGlvbicsXG4gICAgICAnQmF0Y2hKb2InLFxuICAgICAgJ1VzZXJBdXRoUG9vbCdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTdmVsdGVLaXRXZWInLFxuICAgIHJlc291cmNlVHlwZTogJ3N2ZWx0ZWtpdC13ZWInLFxuICAgIHByb3BzVHlwZTogJ1N2ZWx0ZUtpdFdlYlByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU3ZlbHRlS2l0V2ViJyxcbiAgICBzb3VyY2VGaWxlOiAnc3ZlbHRla2l0LXdlYi5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nLFxuICAgICAgJ1ByaXZhdGVTZXJ2aWNlJyxcbiAgICAgICdXZWJTZXJ2aWNlJyxcbiAgICAgICdMYW1iZGFGdW5jdGlvbicsXG4gICAgICAnQmF0Y2hKb2InLFxuICAgICAgJ1VzZXJBdXRoUG9vbCdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTb2xpZFN0YXJ0V2ViJyxcbiAgICByZXNvdXJjZVR5cGU6ICdzb2xpZHN0YXJ0LXdlYicsXG4gICAgcHJvcHNUeXBlOiAnU29saWRTdGFydFdlYlByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU29saWRTdGFydFdlYicsXG4gICAgc291cmNlRmlsZTogJ3NvbGlkc3RhcnQtd2ViLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbScsXG4gICAgICAnUHJpdmF0ZVNlcnZpY2UnLFxuICAgICAgJ1dlYlNlcnZpY2UnLFxuICAgICAgJ0xhbWJkYUZ1bmN0aW9uJyxcbiAgICAgICdCYXRjaEpvYicsXG4gICAgICAnVXNlckF1dGhQb29sJ1xuICAgIF1cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1RhblN0YWNrV2ViJyxcbiAgICByZXNvdXJjZVR5cGU6ICd0YW5zdGFjay13ZWInLFxuICAgIHByb3BzVHlwZTogJ1RhblN0YWNrV2ViUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdUYW5TdGFja1dlYicsXG4gICAgc291cmNlRmlsZTogJ3RhbnN0YWNrLXdlYi5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nLFxuICAgICAgJ1ByaXZhdGVTZXJ2aWNlJyxcbiAgICAgICdXZWJTZXJ2aWNlJyxcbiAgICAgICdMYW1iZGFGdW5jdGlvbicsXG4gICAgICAnQmF0Y2hKb2InLFxuICAgICAgJ1VzZXJBdXRoUG9vbCdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZW1peFdlYicsXG4gICAgcmVzb3VyY2VUeXBlOiAncmVtaXgtd2ViJyxcbiAgICBwcm9wc1R5cGU6ICdSZW1peFdlYlByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmVtaXhXZWInLFxuICAgIHNvdXJjZUZpbGU6ICdyZW1peC13ZWIuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJyxcbiAgICAgICdQcml2YXRlU2VydmljZScsXG4gICAgICAnV2ViU2VydmljZScsXG4gICAgICAnTGFtYmRhRnVuY3Rpb24nLFxuICAgICAgJ0JhdGNoSm9iJyxcbiAgICAgICdVc2VyQXV0aFBvb2wnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQmFzdGlvbicsXG4gICAgcmVzb3VyY2VUeXBlOiAnYmFzdGlvbicsXG4gICAgcHJvcHNUeXBlOiAnQmFzdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQmFzdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2Jhc3Rpb24uZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9XG5dO1xuXG4vKipcbiAqIERlZmluZXMgYWxsIHR5cGUgKyBwcm9wZXJ0aWVzIHNoYXBlZCBkZWZpbml0aW9ucyB0aGF0IGNhbiBiZSBjb252ZXJ0ZWQgdG8gYSBUeXBlc2NyaXB0IGNsYXNzXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVQcm9wZXJ0aWVzRGVmaW5pdGlvbiA9IHtcbiAgY2xhc3NOYW1lOiBzdHJpbmc7XG4gIHR5cGVWYWx1ZTogc3RyaW5nO1xuICBwcm9wc1R5cGU6IHN0cmluZztcbiAgaW50ZXJmYWNlTmFtZTogc3RyaW5nO1xuICBzb3VyY2VGaWxlOiBzdHJpbmc7XG4gIC8qKiBJZiB0cnVlLCB0aGlzIHR5cGUgaGFzIG5vIHByb3BlcnRpZXMgZmllbGQgLSBqdXN0IGEgdHlwZSBkaXNjcmltaW5hdG9yICovXG4gIHR5cGVPbmx5PzogYm9vbGVhbjtcbiAgLyoqIEN1c3RvbSBKU0RvYyBkZXNjcmlwdGlvbiBmb3IgdGhlIGNsYXNzIGNvbnN0cnVjdG9yICovXG4gIGpzZG9jPzogc3RyaW5nO1xufTtcblxuZXhwb3J0IGNvbnN0IE1JU0NfVFlQRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUzogVHlwZVByb3BlcnRpZXNEZWZpbml0aW9uW10gPSBbXG4gIC8vIERhdGFiYXNlIEVuZ2luZXNcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Jkc0VuZ2luZVBvc3RncmVzJyxcbiAgICB0eXBlVmFsdWU6ICdwb3N0Z3JlcycsXG4gICAgcHJvcHNUeXBlOiAnUmRzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Jkc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVNYXJpYWRiJyxcbiAgICB0eXBlVmFsdWU6ICdtYXJpYWRiJyxcbiAgICBwcm9wc1R5cGU6ICdSZHNFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmRzRW5naW5lJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Jkc0VuZ2luZU15c3FsJyxcbiAgICB0eXBlVmFsdWU6ICdteXNxbCcsXG4gICAgcHJvcHNUeXBlOiAnUmRzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Jkc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVPcmFjbGVFRScsXG4gICAgdHlwZVZhbHVlOiAnb3JhY2xlLWVlJyxcbiAgICBwcm9wc1R5cGU6ICdSZHNFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmRzRW5naW5lJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Jkc0VuZ2luZU9yYWNsZVNFMicsXG4gICAgdHlwZVZhbHVlOiAnb3JhY2xlLXNlMicsXG4gICAgcHJvcHNUeXBlOiAnUmRzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Jkc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVTcWxTZXJ2ZXJFRScsXG4gICAgdHlwZVZhbHVlOiAnc3Fsc2VydmVyLWVlJyxcbiAgICBwcm9wc1R5cGU6ICdSZHNFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmRzRW5naW5lJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Jkc0VuZ2luZVNxbFNlcnZlckVYJyxcbiAgICB0eXBlVmFsdWU6ICdzcWxzZXJ2ZXItZXgnLFxuICAgIHByb3BzVHlwZTogJ1Jkc0VuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZHNFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmRzRW5naW5lU3FsU2VydmVyU0UnLFxuICAgIHR5cGVWYWx1ZTogJ3NxbHNlcnZlci1zZScsXG4gICAgcHJvcHNUeXBlOiAnUmRzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Jkc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVTcWxTZXJ2ZXJXZWInLFxuICAgIHR5cGVWYWx1ZTogJ3NxbHNlcnZlci13ZWInLFxuICAgIHByb3BzVHlwZTogJ1Jkc0VuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZHNFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXVyb3JhRW5naW5lUG9zdGdyZXNxbCcsXG4gICAgdHlwZVZhbHVlOiAnYXVyb3JhLXBvc3RncmVzcWwnLFxuICAgIHByb3BzVHlwZTogJ0F1cm9yYUVuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBdXJvcmFFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXVyb3JhRW5naW5lTXlzcWwnLFxuICAgIHR5cGVWYWx1ZTogJ2F1cm9yYS1teXNxbCcsXG4gICAgcHJvcHNUeXBlOiAnQXVyb3JhRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0F1cm9yYUVuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBdXJvcmFTZXJ2ZXJsZXNzRW5naW5lUG9zdGdyZXNxbCcsXG4gICAgdHlwZVZhbHVlOiAnYXVyb3JhLXBvc3RncmVzcWwtc2VydmVybGVzcycsXG4gICAgcHJvcHNUeXBlOiAnQXVyb3JhU2VydmVybGVzc0VuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBdXJvcmFTZXJ2ZXJsZXNzRW5naW5lJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0F1cm9yYVNlcnZlcmxlc3NFbmdpbmVNeXNxbCcsXG4gICAgdHlwZVZhbHVlOiAnYXVyb3JhLW15c3FsLXNlcnZlcmxlc3MnLFxuICAgIHByb3BzVHlwZTogJ0F1cm9yYVNlcnZlcmxlc3NFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXVyb3JhU2VydmVybGVzc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBdXJvcmFTZXJ2ZXJsZXNzVjJFbmdpbmVQb3N0Z3Jlc3FsJyxcbiAgICB0eXBlVmFsdWU6ICdhdXJvcmEtcG9zdGdyZXNxbC1zZXJ2ZXJsZXNzLXYyJyxcbiAgICBwcm9wc1R5cGU6ICdBdXJvcmFTZXJ2ZXJsZXNzVjJFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXVyb3JhU2VydmVybGVzc1YyRW5naW5lJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0F1cm9yYVNlcnZlcmxlc3NWMkVuZ2luZU15c3FsJyxcbiAgICB0eXBlVmFsdWU6ICdhdXJvcmEtbXlzcWwtc2VydmVybGVzcy12MicsXG4gICAgcHJvcHNUeXBlOiAnQXVyb3JhU2VydmVybGVzc1YyRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0F1cm9yYVNlcnZlcmxlc3NWMkVuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIC8vIExhbWJkYSBQYWNrYWdpbmdcbiAge1xuICAgIGNsYXNzTmFtZTogJ1N0YWNrdGFwZUxhbWJkYUJ1aWxkcGFja1BhY2thZ2luZycsXG4gICAgdHlwZVZhbHVlOiAnc3RhY2t0YXBlLWxhbWJkYS1idWlsZHBhY2snLFxuICAgIHByb3BzVHlwZTogJ1N0cEJ1aWxkcGFja0xhbWJkYVBhY2thZ2luZ1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU3RwQnVpbGRwYWNrTGFtYmRhUGFja2FnaW5nJyxcbiAgICBzb3VyY2VGaWxlOiAnZGVwbG95bWVudC1hcnRpZmFjdHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0N1c3RvbUFydGlmYWN0TGFtYmRhUGFja2FnaW5nJyxcbiAgICB0eXBlVmFsdWU6ICdjdXN0b20tYXJ0aWZhY3QnLFxuICAgIHByb3BzVHlwZTogJ0N1c3RvbUFydGlmYWN0TGFtYmRhUGFja2FnaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDdXN0b21BcnRpZmFjdExhbWJkYVBhY2thZ2luZycsXG4gICAgc291cmNlRmlsZTogJ2RlcGxveW1lbnQtYXJ0aWZhY3RzLmQudHMnXG4gIH0sXG4gIC8vIENvbnRhaW5lciBQYWNrYWdpbmdcbiAge1xuICAgIGNsYXNzTmFtZTogJ1ByZWJ1aWx0SW1hZ2VQYWNrYWdpbmcnLFxuICAgIHR5cGVWYWx1ZTogJ3ByZWJ1aWx0LWltYWdlJyxcbiAgICBwcm9wc1R5cGU6ICdQcmVidWlsdEltYWdlQ3dQYWNrYWdpbmdQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1ByZWJ1aWx0Q3dJbWFnZVBhY2thZ2luZycsXG4gICAgc291cmNlRmlsZTogJ2RlcGxveW1lbnQtYXJ0aWZhY3RzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDdXN0b21Eb2NrZXJmaWxlUGFja2FnaW5nJyxcbiAgICB0eXBlVmFsdWU6ICdjdXN0b20tZG9ja2VyZmlsZScsXG4gICAgcHJvcHNUeXBlOiAnQ3VzdG9tRG9ja2VyZmlsZUN3SW1hZ2VQYWNrYWdpbmdQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0N1c3RvbURvY2tlcmZpbGVDd0ltYWdlUGFja2FnaW5nJyxcbiAgICBzb3VyY2VGaWxlOiAnZGVwbG95bWVudC1hcnRpZmFjdHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0V4dGVybmFsQnVpbGRwYWNrUGFja2FnaW5nJyxcbiAgICB0eXBlVmFsdWU6ICdleHRlcm5hbC1idWlsZHBhY2snLFxuICAgIHByb3BzVHlwZTogJ0V4dGVybmFsQnVpbGRwYWNrQ3dJbWFnZVBhY2thZ2luZ1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnRXh0ZXJuYWxCdWlsZHBhY2tDd0ltYWdlUGFja2FnaW5nJyxcbiAgICBzb3VyY2VGaWxlOiAnZGVwbG95bWVudC1hcnRpZmFjdHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ05peHBhY2tzUGFja2FnaW5nJyxcbiAgICB0eXBlVmFsdWU6ICduaXhwYWNrcycsXG4gICAgcHJvcHNUeXBlOiAnTml4cGFja3NDd0ltYWdlUGFja2FnaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdOaXhwYWNrc0N3SW1hZ2VQYWNrYWdpbmcnLFxuICAgIHNvdXJjZUZpbGU6ICdkZXBsb3ltZW50LWFydGlmYWN0cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnU3RhY2t0YXBlSW1hZ2VCdWlsZHBhY2tQYWNrYWdpbmcnLFxuICAgIHR5cGVWYWx1ZTogJ3N0YWNrdGFwZS1pbWFnZS1idWlsZHBhY2snLFxuICAgIHByb3BzVHlwZTogJ1N0cEJ1aWxkcGFja0N3SW1hZ2VQYWNrYWdpbmdQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1N0cEJ1aWxkcGFja0N3SW1hZ2VQYWNrYWdpbmcnLFxuICAgIHNvdXJjZUZpbGU6ICdkZXBsb3ltZW50LWFydGlmYWN0cy5kLnRzJ1xuICB9LFxuICAvLyBMYW1iZGEgRnVuY3Rpb24gRXZlbnRzL0ludGVncmF0aW9uc1xuICB7XG4gICAgY2xhc3NOYW1lOiAnSHR0cEFwaUludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdodHRwLWFwaS1nYXRld2F5JyxcbiAgICBwcm9wc1R5cGU6ICdIdHRwQXBpSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0h0dHBBcGlJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUzNJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnczMnLFxuICAgIHByb3BzVHlwZTogJ1MzSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1MzSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1NjaGVkdWxlSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ3NjaGVkdWxlJyxcbiAgICBwcm9wc1R5cGU6ICdTY2hlZHVsZUludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTY2hlZHVsZUludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTbnNJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnc25zJyxcbiAgICBwcm9wc1R5cGU6ICdTbnNJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU25zSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Nxc0ludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdzcXMnLFxuICAgIHByb3BzVHlwZTogJ1Nxc0ludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTcXNJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnS2luZXNpc0ludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdraW5lc2lzJyxcbiAgICBwcm9wc1R5cGU6ICdLaW5lc2lzSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0tpbmVzaXNJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnRHluYW1vRGJJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnZHluYW1vZGInLFxuICAgIHByb3BzVHlwZTogJ0R5bmFtb0RiSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0R5bmFtb0RiSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0Nsb3Vkd2F0Y2hMb2dJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnY2xvdWR3YXRjaC1sb2dzJyxcbiAgICBwcm9wc1R5cGU6ICdDbG91ZHdhdGNoTG9nSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0Nsb3Vkd2F0Y2hMb2dJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlcicsXG4gICAgcHJvcHNUeXBlOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnRXZlbnRCdXNJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnZXZlbnQtYnVzJyxcbiAgICBwcm9wc1R5cGU6ICdFdmVudEJ1c0ludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdFdmVudEJ1c0ludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdLYWZrYVRvcGljSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2thZmthLXRvcGljJyxcbiAgICBwcm9wc1R5cGU6ICdLYWZrYVRvcGljSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0thZmthVG9waWNJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQWxhcm1JbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnYWxhcm0nLFxuICAgIHByb3BzVHlwZTogJ0FsYXJtSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0FsYXJtSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0lvdEludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdpb3QnLFxuICAgIHByb3BzVHlwZTogJ0lvdEludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdJb3RJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICAvLyBDRE4gUm91dGVzXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDZG5Mb2FkQmFsYW5jZXJSb3V0ZScsXG4gICAgdHlwZVZhbHVlOiAnYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlcicsXG4gICAgcHJvcHNUeXBlOiAnQ2RuTG9hZEJhbGFuY2VyT3JpZ2luJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ2RuTG9hZEJhbGFuY2VyT3JpZ2luJyxcbiAgICBzb3VyY2VGaWxlOiAnY2RuLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDZG5IdHRwQXBpR2F0ZXdheVJvdXRlJyxcbiAgICB0eXBlVmFsdWU6ICdodHRwLWFwaS1nYXRld2F5JyxcbiAgICBwcm9wc1R5cGU6ICdDZG5IdHRwQXBpR2F0ZXdheU9yaWdpbicsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0Nkbkh0dHBBcGlHYXRld2F5T3JpZ2luJyxcbiAgICBzb3VyY2VGaWxlOiAnY2RuLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDZG5MYW1iZGFGdW5jdGlvblJvdXRlJyxcbiAgICB0eXBlVmFsdWU6ICdmdW5jdGlvbicsXG4gICAgcHJvcHNUeXBlOiAnQ2RuTGFtYmRhRnVuY3Rpb25PcmlnaW4nLFxuICAgIGludGVyZmFjZU5hbWU6ICdDZG5MYW1iZGFGdW5jdGlvbk9yaWdpbicsXG4gICAgc291cmNlRmlsZTogJ2Nkbi5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQ2RuQ3VzdG9tRG9tYWluUm91dGUnLFxuICAgIHR5cGVWYWx1ZTogJ2N1c3RvbS1vcmlnaW4nLFxuICAgIHByb3BzVHlwZTogJ0NkbkN1c3RvbU9yaWdpbicsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0NkbkN1c3RvbU9yaWdpbicsXG4gICAgc291cmNlRmlsZTogJ2Nkbi5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQ2RuQnVja2V0Um91dGUnLFxuICAgIHR5cGVWYWx1ZTogJ2J1Y2tldCcsXG4gICAgcHJvcHNUeXBlOiAnQ2RuQnVja2V0T3JpZ2luJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ2RuQnVja2V0T3JpZ2luJyxcbiAgICBzb3VyY2VGaWxlOiAnY2RuLmQudHMnXG4gIH0sXG4gIC8vIFdlYiBBcHAgRmlyZXdhbGwgUnVsZXNcbiAge1xuICAgIGNsYXNzTmFtZTogJ01hbmFnZWRSdWxlR3JvdXAnLFxuICAgIHR5cGVWYWx1ZTogJ21hbmFnZWQtcnVsZS1ncm91cCcsXG4gICAgcHJvcHNUeXBlOiAnTWFuYWdlZFJ1bGVHcm91cFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTWFuYWdlZFJ1bGVHcm91cCcsXG4gICAgc291cmNlRmlsZTogJ3dlYi1hcHAtZmlyZXdhbGwuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0N1c3RvbVJ1bGVHcm91cCcsXG4gICAgdHlwZVZhbHVlOiAnY3VzdG9tLXJ1bGUtZ3JvdXAnLFxuICAgIHByb3BzVHlwZTogJ0N1c3RvbVJ1bGVHcm91cFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ3VzdG9tUnVsZUdyb3VwJyxcbiAgICBzb3VyY2VGaWxlOiAnd2ViLWFwcC1maXJld2FsbC5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmF0ZUJhc2VkUnVsZScsXG4gICAgdHlwZVZhbHVlOiAncmF0ZS1iYXNlZC1ydWxlJyxcbiAgICBwcm9wc1R5cGU6ICdSYXRlQmFzZWRTdGF0ZW1lbnRQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1JhdGVCYXNlZFJ1bGUnLFxuICAgIHNvdXJjZUZpbGU6ICd3ZWItYXBwLWZpcmV3YWxsLmQudHMnXG4gIH0sXG4gIC8vIFNRUyBRdWV1ZSBJbnRlZ3JhdGlvbnNcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Nxc1F1ZXVlRXZlbnRCdXNJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnZXZlbnQtYnVzJyxcbiAgICBwcm9wc1R5cGU6ICdTcXNRdWV1ZUV2ZW50QnVzSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Nxc1F1ZXVlRXZlbnRCdXNJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ3Nxcy1xdWV1ZXMuZC50cydcbiAgfSxcbiAgLy8gTXVsdGkgQ29udGFpbmVyIFdvcmtsb2FkIEludGVncmF0aW9uc1xuICB7XG4gICAgY2xhc3NOYW1lOiAnTXVsdGlDb250YWluZXJXb3JrbG9hZEh0dHBBcGlJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnaHR0cC1hcGktZ2F0ZXdheScsXG4gICAgcHJvcHNUeXBlOiAnQ29udGFpbmVyV29ya2xvYWRIdHRwQXBpSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0NvbnRhaW5lcldvcmtsb2FkSHR0cEFwaUludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnbXVsdGktY29udGFpbmVyLXdvcmtsb2Fkcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTXVsdGlDb250YWluZXJXb3JrbG9hZExvYWRCYWxhbmNlckludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyJyxcbiAgICBwcm9wc1R5cGU6ICdDb250YWluZXJXb3JrbG9hZExvYWRCYWxhbmNlckludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDb250YWluZXJXb3JrbG9hZExvYWRCYWxhbmNlckludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnbXVsdGktY29udGFpbmVyLXdvcmtsb2Fkcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTXVsdGlDb250YWluZXJXb3JrbG9hZE5ldHdvcmtMb2FkQmFsYW5jZXJJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnbmV0d29yay1sb2FkLWJhbGFuY2VyJyxcbiAgICBwcm9wc1R5cGU6ICdDb250YWluZXJXb3JrbG9hZE5ldHdvcmtMb2FkQmFsYW5jZXJJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ29udGFpbmVyV29ya2xvYWROZXR3b3JrTG9hZEJhbGFuY2VySW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdtdWx0aS1jb250YWluZXItd29ya2xvYWRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdNdWx0aUNvbnRhaW5lcldvcmtsb2FkSW50ZXJuYWxJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnd29ya2xvYWQtaW50ZXJuYWwnLFxuICAgIHByb3BzVHlwZTogJ0NvbnRhaW5lcldvcmtsb2FkSW50ZXJuYWxJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ29udGFpbmVyV29ya2xvYWRJbnRlcm5hbEludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnbXVsdGktY29udGFpbmVyLXdvcmtsb2Fkcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTXVsdGlDb250YWluZXJXb3JrbG9hZFNlcnZpY2VDb25uZWN0SW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ3NlcnZpY2UtY29ubmVjdCcsXG4gICAgcHJvcHNUeXBlOiAnQ29udGFpbmVyV29ya2xvYWRTZXJ2aWNlQ29ubmVjdEludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDb250YWluZXJXb3JrbG9hZFNlcnZpY2VDb25uZWN0SW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdtdWx0aS1jb250YWluZXItd29ya2xvYWRzLmQudHMnXG4gIH0sXG4gIC8vIFNjcmlwdHNcbiAge1xuICAgIGNsYXNzTmFtZTogJ0xvY2FsU2NyaXB0JyxcbiAgICB0eXBlVmFsdWU6ICdsb2NhbC1zY3JpcHQnLFxuICAgIHByb3BzVHlwZTogJ0xvY2FsU2NyaXB0UHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdMb2NhbFNjcmlwdCcsXG4gICAgc291cmNlRmlsZTogJ19faGVscGVycy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQmFzdGlvblNjcmlwdCcsXG4gICAgdHlwZVZhbHVlOiAnYmFzdGlvbi1zY3JpcHQnLFxuICAgIHByb3BzVHlwZTogJ0Jhc3Rpb25TY3JpcHRQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0Jhc3Rpb25TY3JpcHQnLFxuICAgIHNvdXJjZUZpbGU6ICdfX2hlbHBlcnMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0xvY2FsU2NyaXB0V2l0aEJhc3Rpb25UdW5uZWxpbmcnLFxuICAgIHR5cGVWYWx1ZTogJ2xvY2FsLXNjcmlwdC13aXRoLWJhc3Rpb24tdHVubmVsaW5nJyxcbiAgICBwcm9wc1R5cGU6ICdMb2NhbFNjcmlwdFdpdGhCYXN0aW9uVHVubmVsaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdMb2NhbFNjcmlwdFdpdGhCYXN0aW9uVHVubmVsaW5nJyxcbiAgICBzb3VyY2VGaWxlOiAnX19oZWxwZXJzLmQudHMnXG4gIH0sXG4gIC8vIExvZyBGb3J3YXJkaW5nXG4gIHtcbiAgICBjbGFzc05hbWU6ICdIdHRwRW5kcG9pbnRMb2dGb3J3YXJkaW5nJyxcbiAgICB0eXBlVmFsdWU6ICdodHRwLWVuZHBvaW50JyxcbiAgICBwcm9wc1R5cGU6ICdIdHRwRW5kcG9pbnRMb2dGb3J3YXJkaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdIdHRwRW5kcG9pbnRMb2dGb3J3YXJkaW5nJyxcbiAgICBzb3VyY2VGaWxlOiAnX19oZWxwZXJzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdIaWdobGlnaHRMb2dGb3J3YXJkaW5nJyxcbiAgICB0eXBlVmFsdWU6ICdoaWdobGlnaHQnLFxuICAgIHByb3BzVHlwZTogJ0hpZ2hsaWdodExvZ0ZvcndhcmRpbmdQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0hpZ2hsaWdodExvZ0ZvcndhcmRpbmcnLFxuICAgIHNvdXJjZUZpbGU6ICdfX2hlbHBlcnMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0RhdGFkb2dMb2dGb3J3YXJkaW5nJyxcbiAgICB0eXBlVmFsdWU6ICdkYXRhZG9nJyxcbiAgICBwcm9wc1R5cGU6ICdEYXRhZG9nTG9nRm9yd2FyZGluZ1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnRGF0YWRvZ0xvZ0ZvcndhcmRpbmcnLFxuICAgIHNvdXJjZUZpbGU6ICdfX2hlbHBlcnMuZC50cydcbiAgfSxcbiAgLy8gQnVja2V0IExpZmVjeWNsZSBSdWxlc1xuICB7XG4gICAgY2xhc3NOYW1lOiAnRXhwaXJhdGlvbkxpZmVjeWNsZVJ1bGUnLFxuICAgIHR5cGVWYWx1ZTogJ2V4cGlyYXRpb24nLFxuICAgIHByb3BzVHlwZTogJ0V4cGlyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0V4cGlyYXRpb25MaWZlY3ljbGVSdWxlJyxcbiAgICBzb3VyY2VGaWxlOiAnYnVja2V0cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTm9uQ3VycmVudFZlcnNpb25FeHBpcmF0aW9uTGlmZWN5Y2xlUnVsZScsXG4gICAgdHlwZVZhbHVlOiAnbm9uLWN1cnJlbnQtdmVyc2lvbi1leHBpcmF0aW9uJyxcbiAgICBwcm9wc1R5cGU6ICdOb25DdXJyZW50VmVyc2lvbkV4cGlyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ05vbkN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbkxpZmVjeWNsZVJ1bGUnLFxuICAgIHNvdXJjZUZpbGU6ICdidWNrZXRzLmQudHMnXG4gIH0sXG4gIC8vIEVGUyBNb3VudHNcbiAge1xuICAgIGNsYXNzTmFtZTogJ0NvbnRhaW5lckVmc01vdW50JyxcbiAgICB0eXBlVmFsdWU6ICdlZnMnLFxuICAgIHByb3BzVHlwZTogJ0NvbnRhaW5lckVmc01vdW50UHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDb250YWluZXJFZnNNb3VudCcsXG4gICAgc291cmNlRmlsZTogJ19faGVscGVycy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTGFtYmRhRWZzTW91bnQnLFxuICAgIHR5cGVWYWx1ZTogJ2VmcycsXG4gICAgcHJvcHNUeXBlOiAnTGFtYmRhRWZzTW91bnRQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0xhbWJkYUVmc01vdW50JyxcbiAgICBzb3VyY2VGaWxlOiAnZnVuY3Rpb25zLmQudHMnXG4gIH0sXG4gIC8vIEF1dGhvcml6ZXJzXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDb2duaXRvQXV0aG9yaXplcicsXG4gICAgdHlwZVZhbHVlOiAnY29nbml0bycsXG4gICAgcHJvcHNUeXBlOiAnQ29nbml0b0F1dGhvcml6ZXJQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ29nbml0b0F1dGhvcml6ZXInLFxuICAgIHNvdXJjZUZpbGU6ICd1c2VyLXBvb2xzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdMYW1iZGFBdXRob3JpemVyJyxcbiAgICB0eXBlVmFsdWU6ICdsYW1iZGEnLFxuICAgIHByb3BzVHlwZTogJ0xhbWJkYUF1dGhvcml6ZXJQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTGFtYmRhQXV0aG9yaXplcicsXG4gICAgc291cmNlRmlsZTogJ3VzZXItcG9vbHMuZC50cydcbiAgfSxcbiAgLy8gQWxhcm0gVHJpZ2dlcnNcbiAge1xuICAgIGNsYXNzTmFtZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyQ3VzdG9tVHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlci1jdXN0b20nLFxuICAgIHByb3BzVHlwZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyQ3VzdG9tVHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJDdXN0b21UcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm0tbWV0cmljcy5kLnRzJyxcbiAgICBqc2RvYzpcbiAgICAgICdUcmlnZ2VycyBhbiBhbGFybSBiYXNlZCBvbiBhbnkgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlciBDbG91ZFdhdGNoIG1ldHJpYyAoZS5nLiwgY29ubmVjdGlvbiBjb3VudHMsIHJlcXVlc3QgY291bnRzLCB0YXJnZXQgcmVzcG9uc2UgdGltZXMpLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyRXJyb3JSYXRlVHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlci1lcnJvci1yYXRlJyxcbiAgICBwcm9wc1R5cGU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlckVycm9yUmF0ZVRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyRXJyb3JSYXRlVHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzpcbiAgICAgICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIHRoZSBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyIGVycm9yIHJhdGUgKHBlcmNlbnRhZ2Ugb2YgNHh4LzV4eCByZXNwb25zZXMpIGV4Y2VlZHMgdGhlIHRocmVzaG9sZC4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlclVuaGVhbHRoeVRhcmdldHNUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyLXVuaGVhbHRoeS10YXJnZXRzJyxcbiAgICBwcm9wc1R5cGU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlclVuaGVhbHRoeVRhcmdldHNUcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlclVuaGVhbHRoeVRhcmdldHNUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOlxuICAgICAgJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gdGhlIHBlcmNlbnRhZ2Ugb2YgdW5oZWFsdGh5IHRhcmdldHMgYmVoaW5kIHRoZSBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyIGV4Y2VlZHMgdGhlIHRocmVzaG9sZC4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdIdHRwQXBpR2F0ZXdheUVycm9yUmF0ZVRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2h0dHAtYXBpLWdhdGV3YXktZXJyb3ItcmF0ZScsXG4gICAgcHJvcHNUeXBlOiAnSHR0cEFwaUdhdGV3YXlFcnJvclJhdGVUcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdIdHRwQXBpR2F0ZXdheUVycm9yUmF0ZVRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6XG4gICAgICAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiB0aGUgSFRUUCBBUEkgR2F0ZXdheSBlcnJvciByYXRlIChwZXJjZW50YWdlIG9mIDR4eC81eHggcmVzcG9uc2VzKSBleGNlZWRzIHRoZSB0aHJlc2hvbGQuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnSHR0cEFwaUdhdGV3YXlMYXRlbmN5VHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnaHR0cC1hcGktZ2F0ZXdheS1sYXRlbmN5JyxcbiAgICBwcm9wc1R5cGU6ICdIdHRwQXBpR2F0ZXdheUxhdGVuY3lUcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdIdHRwQXBpR2F0ZXdheUxhdGVuY3lUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOlxuICAgICAgJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gSFRUUCBBUEkgR2F0ZXdheSBsYXRlbmN5IGV4Y2VlZHMgdGhlIHRocmVzaG9sZC4gTGF0ZW5jeSBpcyBtZWFzdXJlZCBmcm9tIHJlcXVlc3QgcmVjZWlwdCB0byByZXNwb25zZSBzZW50LidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZVJlYWRMYXRlbmN5VHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnZGF0YWJhc2UtcmVhZC1sYXRlbmN5JyxcbiAgICBwcm9wc1R5cGU6ICdSZWxhdGlvbmFsRGF0YWJhc2VSZWFkTGF0ZW5jeVRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZVJlYWRMYXRlbmN5VHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzogJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gZGF0YWJhc2UgcmVhZCBsYXRlbmN5IChhdmVyYWdlIHRpbWUgZm9yIHJlYWQgSS9PIG9wZXJhdGlvbnMpIGV4Y2VlZHMgdGhlIHRocmVzaG9sZC4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VXcml0ZUxhdGVuY3lUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdkYXRhYmFzZS13cml0ZS1sYXRlbmN5JyxcbiAgICBwcm9wc1R5cGU6ICdSZWxhdGlvbmFsRGF0YWJhc2VXcml0ZUxhdGVuY3lUcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VXcml0ZUxhdGVuY3lUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOlxuICAgICAgJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gZGF0YWJhc2Ugd3JpdGUgbGF0ZW5jeSAoYXZlcmFnZSB0aW1lIGZvciB3cml0ZSBJL08gb3BlcmF0aW9ucykgZXhjZWVkcyB0aGUgdGhyZXNob2xkLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUNQVVV0aWxpemF0aW9uVHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnZGF0YWJhc2UtY3B1LXV0aWxpemF0aW9uJyxcbiAgICBwcm9wc1R5cGU6ICdSZWxhdGlvbmFsRGF0YWJhc2VDUFVVdGlsaXphdGlvblRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUNQVVV0aWxpemF0aW9uVHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzogJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gZGF0YWJhc2UgQ1BVIHV0aWxpemF0aW9uIGV4Y2VlZHMgdGhlIHRocmVzaG9sZCBwZXJjZW50YWdlLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUZyZWVTdG9yYWdlVHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnZGF0YWJhc2UtZnJlZS1zdG9yYWdlJyxcbiAgICBwcm9wc1R5cGU6ICdSZWxhdGlvbmFsRGF0YWJhc2VGcmVlU3RvcmFnZVRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUZyZWVTdG9yYWdlVHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzogJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gYXZhaWxhYmxlIGRhdGFiYXNlIHN0b3JhZ2UgZmFsbHMgYmVsb3cgdGhlIHRocmVzaG9sZCAoaW4gTUIpLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUZyZWVNZW1vcnlUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdkYXRhYmFzZS1mcmVlLW1lbW9yeScsXG4gICAgcHJvcHNUeXBlOiAnUmVsYXRpb25hbERhdGFiYXNlRnJlZU1lbW9yeVRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUZyZWVNZW1vcnlUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOiAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiBhdmFpbGFibGUgZGF0YWJhc2UgbWVtb3J5IGZhbGxzIGJlbG93IHRoZSB0aHJlc2hvbGQgKGluIE1CKS4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VDb25uZWN0aW9uQ291bnRUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdkYXRhYmFzZS1jb25uZWN0aW9uLWNvdW50JyxcbiAgICBwcm9wc1R5cGU6ICdSZWxhdGlvbmFsRGF0YWJhc2VDb25uZWN0aW9uQ291bnRUcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZWxhdGlvbmFsRGF0YWJhc2VDb25uZWN0aW9uQ291bnRUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOiAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiB0aGUgbnVtYmVyIG9mIGRhdGFiYXNlIGNvbm5lY3Rpb25zIGV4Y2VlZHMgdGhlIHRocmVzaG9sZC4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTcXNRdWV1ZVJlY2VpdmVkTWVzc2FnZXNDb3VudFRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ3Nxcy1xdWV1ZS1yZWNlaXZlZC1tZXNzYWdlcy1jb3VudCcsXG4gICAgcHJvcHNUeXBlOiAnU3FzUXVldWVSZWNlaXZlZE1lc3NhZ2VzQ291bnRUcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTcXNRdWV1ZVJlY2VpdmVkTWVzc2FnZXNDb3VudFRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6ICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIHRoZSBudW1iZXIgb2YgbWVzc2FnZXMgcmVjZWl2ZWQgZnJvbSBhbiBTUVMgcXVldWUgY3Jvc3NlcyB0aGUgdGhyZXNob2xkLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Nxc1F1ZXVlTm90RW1wdHlUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdzcXMtcXVldWUtbm90LWVtcHR5JyxcbiAgICBwcm9wc1R5cGU6ICdTcXNRdWV1ZU5vdEVtcHR5VHJpZ2dlcicsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Nxc1F1ZXVlTm90RW1wdHlUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIHR5cGVPbmx5OiB0cnVlLFxuICAgIGpzZG9jOiAnVHJpZ2dlcnMgYW4gYWxhcm0gaWYgdGhlIFNRUyBxdWV1ZSBpcyBub3QgZW1wdHkuIFVzZWZ1bCBmb3IgbW9uaXRvcmluZyBkZWFkLWxldHRlciBxdWV1ZXMuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTGFtYmRhRXJyb3JSYXRlVHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnbGFtYmRhLWVycm9yLXJhdGUnLFxuICAgIHByb3BzVHlwZTogJ0xhbWJkYUVycm9yUmF0ZVRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0xhbWJkYUVycm9yUmF0ZVRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6XG4gICAgICAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiB0aGUgTGFtYmRhIGZ1bmN0aW9uIGVycm9yIHJhdGUgKHBlcmNlbnRhZ2Ugb2YgZmFpbGVkIGludm9jYXRpb25zKSBleGNlZWRzIHRoZSB0aHJlc2hvbGQuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTGFtYmRhRHVyYXRpb25UcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdsYW1iZGEtZHVyYXRpb24nLFxuICAgIHByb3BzVHlwZTogJ0xhbWJkYUR1cmF0aW9uVHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTGFtYmRhRHVyYXRpb25UcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOiAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiBMYW1iZGEgZnVuY3Rpb24gZXhlY3V0aW9uIGR1cmF0aW9uIGV4Y2VlZHMgdGhlIHRocmVzaG9sZCAoaW4gbWlsbGlzZWNvbmRzKS4nXG4gIH0sXG4gIC8vIEN1c3RvbSBSZXNvdXJjZXNcbiAge1xuICAgIGNsYXNzTmFtZTogJ0N1c3RvbVJlc291cmNlRGVmaW5pdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnY3VzdG9tLXJlc291cmNlLWRlZmluaXRpb24nLFxuICAgIHByb3BzVHlwZTogJ0N1c3RvbVJlc291cmNlRGVmaW5pdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ3VzdG9tUmVzb3VyY2VEZWZpbml0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnY3VzdG9tLXJlc291cmNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQ3VzdG9tUmVzb3VyY2VJbnN0YW5jZScsXG4gICAgdHlwZVZhbHVlOiAnY3VzdG9tLXJlc291cmNlLWluc3RhbmNlJyxcbiAgICBwcm9wc1R5cGU6ICdDdXN0b21SZXNvdXJjZUluc3RhbmNlUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDdXN0b21SZXNvdXJjZUluc3RhbmNlJyxcbiAgICBzb3VyY2VGaWxlOiAnY3VzdG9tLXJlc291cmNlcy5kLnRzJ1xuICB9LFxuICAvLyBEZXBsb3ltZW50IFNjcmlwdHNcbiAge1xuICAgIGNsYXNzTmFtZTogJ0RlcGxveW1lbnRTY3JpcHQnLFxuICAgIHR5cGVWYWx1ZTogJ2RlcGxveW1lbnQtc2NyaXB0JyxcbiAgICBwcm9wc1R5cGU6ICdEZXBsb3ltZW50U2NyaXB0UHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdEZXBsb3ltZW50U2NyaXB0JyxcbiAgICBzb3VyY2VGaWxlOiAnZGVwbG95bWVudC1zY3JpcHQuZC50cydcbiAgfSxcbiAgLy8gRWRnZSBMYW1iZGEgRnVuY3Rpb25zXG4gIHtcbiAgICBjbGFzc05hbWU6ICdFZGdlTGFtYmRhRnVuY3Rpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2VkZ2UtbGFtYmRhLWZ1bmN0aW9uJyxcbiAgICBwcm9wc1R5cGU6ICdFZGdlTGFtYmRhRnVuY3Rpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0VkZ2VMYW1iZGFGdW5jdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2VkZ2UtbGFtYmRhLWZ1bmN0aW9ucy5kLnRzJ1xuICB9XG5dO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBIRUxQRVIgRlVOQ1RJT05TID09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXNvdXJjZUJ5Q2xhc3NOYW1lKGNsYXNzTmFtZTogc3RyaW5nKTogUmVzb3VyY2VEZWZpbml0aW9uIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIFJFU09VUkNFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLmZpbmQoKHIpID0+IHIuY2xhc3NOYW1lID09PSBjbGFzc05hbWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVzb3VyY2VCeVR5cGUocmVzb3VyY2VUeXBlOiBzdHJpbmcpOiBSZXNvdXJjZURlZmluaXRpb24gfCB1bmRlZmluZWQge1xuICByZXR1cm4gUkVTT1VSQ0VTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMuZmluZCgocikgPT4gci5yZXNvdXJjZVR5cGUgPT09IHJlc291cmNlVHlwZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXNvdXJjZXNXaXRoQXVnbWVudGVkUHJvcHMoKTogUmVzb3VyY2VEZWZpbml0aW9uW10ge1xuICByZXR1cm4gUkVTT1VSQ0VTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMuZmlsdGVyKChyKSA9PiByLmhhc0F1Z21lbnRlZFByb3BzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJlc291cmNlc1dpdGhPdmVycmlkZXMoKTogUmVzb3VyY2VEZWZpbml0aW9uW10ge1xuICByZXR1cm4gUkVTT1VSQ0VTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMuZmlsdGVyKChyKSA9PiByLnN1cHBvcnRzT3ZlcnJpZGVzICE9PSBmYWxzZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlUHJvcGVydGllc0J5Q2xhc3NOYW1lKGNsYXNzTmFtZTogc3RyaW5nKTogVHlwZVByb3BlcnRpZXNEZWZpbml0aW9uIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIE1JU0NfVFlQRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUy5maW5kKCh0KSA9PiB0LmNsYXNzTmFtZSA9PT0gY2xhc3NOYW1lKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVQcm9wZXJ0aWVzQnlUeXBlVmFsdWUodHlwZVZhbHVlOiBzdHJpbmcpOiBUeXBlUHJvcGVydGllc0RlZmluaXRpb24gfCB1bmRlZmluZWQge1xuICByZXR1cm4gTUlTQ19UWVBFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLmZpbmQoKHQpID0+IHQudHlwZVZhbHVlID09PSB0eXBlVmFsdWUpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PSBERVJJVkVEIE1BUFBJTkdTID09PT09PT09PT09PT09PT09PT09XG5cbi8qKiBSZXNvdXJjZSB0eXBlIOKGkiBjbGFzcyBuYW1lIG1hcHBpbmcgKi9cbmV4cG9ydCBjb25zdCBSRVNPVVJDRV9UWVBFX1RPX0NMQVNTOiBSZWNvcmQ8c3RyaW5nLCBSZXNvdXJjZUNsYXNzTmFtZT4gPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gIFJFU09VUkNFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLm1hcCgocikgPT4gW3IucmVzb3VyY2VUeXBlLCByLmNsYXNzTmFtZV0pXG4pO1xuXG4vKiogU2NyaXB0IHR5cGUg4oaSIGNsYXNzIG5hbWUgbWFwcGluZyAqL1xuZXhwb3J0IGNvbnN0IFNDUklQVF9UWVBFX1RPX0NMQVNTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuICBNSVNDX1RZUEVTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMuZmlsdGVyKFxuICAgICh0KSA9PiB0LnNvdXJjZUZpbGUgPT09ICdfX2hlbHBlcnMuZC50cycgJiYgdC5wcm9wc1R5cGUuaW5jbHVkZXMoJ1NjcmlwdCcpXG4gICkubWFwKCh0KSA9PiBbdC50eXBlVmFsdWUsIHQuY2xhc3NOYW1lXSlcbik7XG5cbi8qKiBQYWNrYWdpbmcgdHlwZSDihpIgY2xhc3MgbmFtZSBtYXBwaW5nICovXG5leHBvcnQgY29uc3QgUEFDS0FHSU5HX1RZUEVfVE9fQ0xBU1M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gIE1JU0NfVFlQRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUy5maWx0ZXIoKHQpID0+IHQuc291cmNlRmlsZSA9PT0gJ2RlcGxveW1lbnQtYXJ0aWZhY3RzLmQudHMnKS5tYXAoKHQpID0+IFtcbiAgICB0LnR5cGVWYWx1ZSxcbiAgICB0LmNsYXNzTmFtZVxuICBdKVxuKTtcblxuLyoqIEVuZ2luZSB0eXBlIOKGkiBjbGFzcyBuYW1lIG1hcHBpbmcgKi9cbmV4cG9ydCBjb25zdCBFTkdJTkVfVFlQRV9UT19DTEFTUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgTUlTQ19UWVBFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLmZpbHRlcigodCkgPT4gdC5wcm9wc1R5cGUuaW5jbHVkZXMoJ0VuZ2luZScpKS5tYXAoKHQpID0+IFt0LnR5cGVWYWx1ZSwgdC5jbGFzc05hbWVdKVxuKTtcbiIsCiAgICAiLy8gUmUtZXhwb3J0IGZyb20gY2xhc3MtY29uZmlnIChzaW5nbGUgc291cmNlIG9mIHRydXRoKVxuZXhwb3J0IHtcbiAgZ2V0UmVzb3VyY2VCeUNsYXNzTmFtZSxcbiAgZ2V0UmVzb3VyY2VCeVR5cGUsXG4gIGdldFJlc291cmNlc1dpdGhBdWdtZW50ZWRQcm9wcyxcbiAgZ2V0UmVzb3VyY2VzV2l0aE92ZXJyaWRlcyxcbiAgZ2V0VHlwZVByb3BlcnRpZXNCeUNsYXNzTmFtZSxcbiAgZ2V0VHlwZVByb3BlcnRpZXNCeVR5cGVWYWx1ZSxcbiAgTUlTQ19UWVBFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLFxuICB0eXBlIFJlc291cmNlRGVmaW5pdGlvbixcbiAgUkVTT1VSQ0VTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMsXG4gIHR5cGUgVHlwZVByb3BlcnRpZXNEZWZpbml0aW9uXG59IGZyb20gJy4vY2xhc3MtY29uZmlnJztcblxuLy8gVGhlc2UgY2FuIGJlIHJlZmVyZW5jZWQgdXNpbmcgJFJlc291cmNlUGFyYW0gZGlyZWN0aXZlXG5leHBvcnQgY29uc3QgUkVGRVJFTkNFQUJMRV9QQVJBTVM6IFJlY29yZDxzdHJpbmcsIEFycmF5PHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbjogc3RyaW5nIH0+PiA9IHtcbiAgJ3JlbGF0aW9uYWwtZGF0YWJhc2UnOiBbXG4gICAgeyBuYW1lOiAnY29ubmVjdGlvblN0cmluZycsIGRlc2NyaXB0aW9uOiAnQ29ubmVjdGlvbiBzdHJpbmcgZm9yIHRoZSBkYXRhYmFzZScgfSxcbiAgICB7IG5hbWU6ICdqZGJjQ29ubmVjdGlvblN0cmluZycsIGRlc2NyaXB0aW9uOiAnSkRCQyBjb25uZWN0aW9uIHN0cmluZycgfSxcbiAgICB7IG5hbWU6ICdob3N0JywgZGVzY3JpcHRpb246ICdEYXRhYmFzZSBob3N0JyB9LFxuICAgIHsgbmFtZTogJ3BvcnQnLCBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIHBvcnQnIH0sXG4gICAgeyBuYW1lOiAnZGJOYW1lJywgZGVzY3JpcHRpb246ICdEYXRhYmFzZSBuYW1lJyB9LFxuICAgIHsgbmFtZTogJ3JlYWRlckhvc3QnLCBkZXNjcmlwdGlvbjogJ1JlYWRlciBlbmRwb2ludCBob3N0JyB9LFxuICAgIHsgbmFtZTogJ3JlYWRlckNvbm5lY3Rpb25TdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1JlYWRlciBjb25uZWN0aW9uIHN0cmluZycgfSxcbiAgICB7IG5hbWU6ICdyZWFkZXJKZGJjQ29ubmVjdGlvblN0cmluZycsIGRlc2NyaXB0aW9uOiAnUmVhZGVyIEpEQkMgY29ubmVjdGlvbiBzdHJpbmcnIH1cbiAgXSxcbiAgJ3dlYi1zZXJ2aWNlJzogW1xuICAgIHsgbmFtZTogJ2RvbWFpbicsIGRlc2NyaXB0aW9uOiAnV2ViIHNlcnZpY2UgZG9tYWluJyB9LFxuICAgIHsgbmFtZTogJ3VybCcsIGRlc2NyaXB0aW9uOiAnV2ViIHNlcnZpY2UgVVJMJyB9LFxuICAgIHsgbmFtZTogJ2N1c3RvbURvbWFpbnMnLCBkZXNjcmlwdGlvbjogJ0N1c3RvbSBkb21haW5zJyB9LFxuICAgIHsgbmFtZTogJ2N1c3RvbURvbWFpblVybHMnLCBkZXNjcmlwdGlvbjogJ0N1c3RvbSBkb21haW4gVVJMcycgfVxuICBdLFxuICAncHJpdmF0ZS1zZXJ2aWNlJzogW3sgbmFtZTogJ2FkZHJlc3MnLCBkZXNjcmlwdGlvbjogJ1ByaXZhdGUgc2VydmljZSBhZGRyZXNzJyB9XSxcbiAgYnVja2V0OiBbXG4gICAgeyBuYW1lOiAnbmFtZScsIGRlc2NyaXB0aW9uOiAnQnVja2V0IG5hbWUnIH0sXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdCdWNrZXQgQVJOJyB9XG4gIF0sXG4gICdkeW5hbW8tZGItdGFibGUnOiBbXG4gICAgeyBuYW1lOiAnbmFtZScsIGRlc2NyaXB0aW9uOiAnVGFibGUgbmFtZScgfSxcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ1RhYmxlIEFSTicgfSxcbiAgICB7IG5hbWU6ICdzdHJlYW1Bcm4nLCBkZXNjcmlwdGlvbjogJ1N0cmVhbSBBUk4nIH1cbiAgXSxcbiAgZnVuY3Rpb246IFtcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ0Z1bmN0aW9uIEFSTicgfSxcbiAgICB7IG5hbWU6ICdsb2dHcm91cEFybicsIGRlc2NyaXB0aW9uOiAnTG9nIGdyb3VwIEFSTicgfVxuICBdLFxuICAnYmF0Y2gtam9iJzogW1xuICAgIHsgbmFtZTogJ2pvYkRlZmluaXRpb25Bcm4nLCBkZXNjcmlwdGlvbjogJ0pvYiBkZWZpbml0aW9uIEFSTicgfSxcbiAgICB7IG5hbWU6ICdzdGF0ZU1hY2hpbmVBcm4nLCBkZXNjcmlwdGlvbjogJ1N0YXRlIG1hY2hpbmUgQVJOJyB9LFxuICAgIHsgbmFtZTogJ2xvZ0dyb3VwQXJuJywgZGVzY3JpcHRpb246ICdMb2cgZ3JvdXAgQVJOJyB9XG4gIF0sXG4gICdldmVudC1idXMnOiBbXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdFdmVudCBidXMgQVJOJyB9LFxuICAgIHsgbmFtZTogJ2FyY2hpdmVBcm4nLCBkZXNjcmlwdGlvbjogJ0FyY2hpdmUgQVJOJyB9XG4gIF0sXG4gICdodHRwLWFwaS1nYXRld2F5JzogW1xuICAgIHsgbmFtZTogJ2RvbWFpbicsIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgZG9tYWluJyB9LFxuICAgIHsgbmFtZTogJ3VybCcsIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyB9LFxuICAgIHsgbmFtZTogJ2N1c3RvbURvbWFpbnMnLCBkZXNjcmlwdGlvbjogJ0N1c3RvbSBkb21haW5zJyB9LFxuICAgIHsgbmFtZTogJ2N1c3RvbURvbWFpblVybHMnLCBkZXNjcmlwdGlvbjogJ0N1c3RvbSBkb21haW4gVVJMcycgfSxcbiAgICB7IG5hbWU6ICdjdXN0b21Eb21haW5VcmwnLCBkZXNjcmlwdGlvbjogJ0ZpcnN0IGN1c3RvbSBkb21haW4gVVJMJyB9XG4gIF0sXG4gICdtb25nby1kYi1hdGxhcy1jbHVzdGVyJzogW3sgbmFtZTogJ2Nvbm5lY3Rpb25TdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01vbmdvREIgY29ubmVjdGlvbiBzdHJpbmcnIH1dLFxuICAncmVkaXMtY2x1c3Rlcic6IFtcbiAgICB7IG5hbWU6ICdob3N0JywgZGVzY3JpcHRpb246ICdSZWRpcyBob3N0JyB9LFxuICAgIHsgbmFtZTogJ3JlYWRlckhvc3QnLCBkZXNjcmlwdGlvbjogJ1JlZGlzIHJlYWRlciBob3N0JyB9LFxuICAgIHsgbmFtZTogJ3BvcnQnLCBkZXNjcmlwdGlvbjogJ1JlZGlzIHBvcnQnIH0sXG4gICAgeyBuYW1lOiAnc2hhcmRpbmcnLCBkZXNjcmlwdGlvbjogJ1NoYXJkaW5nIHN0YXR1cycgfVxuICBdLFxuICAnc3RhdGUtbWFjaGluZSc6IFtcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ1N0YXRlIG1hY2hpbmUgQVJOJyB9LFxuICAgIHsgbmFtZTogJ25hbWUnLCBkZXNjcmlwdGlvbjogJ1N0YXRlIG1hY2hpbmUgbmFtZScgfVxuICBdLFxuICAndXNlci1hdXRoLXBvb2wnOiBbXG4gICAgeyBuYW1lOiAnaWQnLCBkZXNjcmlwdGlvbjogJ1VzZXIgcG9vbCBJRCcgfSxcbiAgICB7IG5hbWU6ICdjbGllbnRJZCcsIGRlc2NyaXB0aW9uOiAnQ2xpZW50IElEJyB9LFxuICAgIHsgbmFtZTogJ2RvbWFpbicsIGRlc2NyaXB0aW9uOiAnVXNlciBwb29sIGRvbWFpbicgfVxuICBdLFxuICAndXBzdGFzaC1yZWRpcyc6IFtcbiAgICB7IG5hbWU6ICdob3N0JywgZGVzY3JpcHRpb246ICdVcHN0YXNoIFJlZGlzIGhvc3QnIH0sXG4gICAgeyBuYW1lOiAncG9ydCcsIGRlc2NyaXB0aW9uOiAnVXBzdGFzaCBSZWRpcyBwb3J0JyB9LFxuICAgIHsgbmFtZTogJ3Bhc3N3b3JkJywgZGVzY3JpcHRpb246ICdQYXNzd29yZCcgfSxcbiAgICB7IG5hbWU6ICdyZXN0VG9rZW4nLCBkZXNjcmlwdGlvbjogJ1JFU1QgdG9rZW4nIH0sXG4gICAgeyBuYW1lOiAncmVhZE9ubHlSZXN0VG9rZW4nLCBkZXNjcmlwdGlvbjogJ1JlYWQtb25seSBSRVNUIHRva2VuJyB9LFxuICAgIHsgbmFtZTogJ3Jlc3RVcmwnLCBkZXNjcmlwdGlvbjogJ1JFU1QgVVJMJyB9LFxuICAgIHsgbmFtZTogJ3JlZGlzVXJsJywgZGVzY3JpcHRpb246ICdSZWRpcyBVUkwnIH1cbiAgXSxcbiAgJ2FwcGxpY2F0aW9uLWxvYWQtYmFsYW5jZXInOiBbXG4gICAgeyBuYW1lOiAnZG9tYWluJywgZGVzY3JpcHRpb246ICdMb2FkIGJhbGFuY2VyIGRvbWFpbicgfSxcbiAgICB7IG5hbWU6ICdjdXN0b21Eb21haW5zJywgZGVzY3JpcHRpb246ICdDdXN0b20gZG9tYWlucycgfVxuICBdLFxuICAnbmV0d29yay1sb2FkLWJhbGFuY2VyJzogW1xuICAgIHsgbmFtZTogJ2RvbWFpbicsIGRlc2NyaXB0aW9uOiAnTG9hZCBiYWxhbmNlciBkb21haW4nIH0sXG4gICAgeyBuYW1lOiAnY3VzdG9tRG9tYWlucycsIGRlc2NyaXB0aW9uOiAnQ3VzdG9tIGRvbWFpbnMnIH1cbiAgXSxcbiAgJ2hvc3RpbmctYnVja2V0JzogW1xuICAgIHsgbmFtZTogJ25hbWUnLCBkZXNjcmlwdGlvbjogJ0J1Y2tldCBuYW1lJyB9LFxuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnQnVja2V0IEFSTicgfVxuICBdLFxuICAnd2ViLWFwcC1maXJld2FsbCc6IFtcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ0ZpcmV3YWxsIEFSTicgfSxcbiAgICB7IG5hbWU6ICdzY29wZScsIGRlc2NyaXB0aW9uOiAnRmlyZXdhbGwgc2NvcGUnIH1cbiAgXSxcbiAgJ29wZW4tc2VhcmNoLWRvbWFpbic6IFtcbiAgICB7IG5hbWU6ICdkb21haW5FbmRwb2ludCcsIGRlc2NyaXB0aW9uOiAnT3BlblNlYXJjaCBkb21haW4gZW5kcG9pbnQnIH0sXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdEb21haW4gQVJOJyB9XG4gIF0sXG4gICdlZnMtZmlsZXN5c3RlbSc6IFtcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ0VGUyBBUk4nIH0sXG4gICAgeyBuYW1lOiAnaWQnLCBkZXNjcmlwdGlvbjogJ0VGUyBJRCcgfVxuICBdLFxuICAnbmV4dGpzLXdlYic6IFt7IG5hbWU6ICd1cmwnLCBkZXNjcmlwdGlvbjogJ1dlYnNpdGUgVVJMJyB9XSxcbiAgJ2FzdHJvLXdlYic6IFt7IG5hbWU6ICd1cmwnLCBkZXNjcmlwdGlvbjogJ1dlYnNpdGUgVVJMJyB9XSxcbiAgJ251eHQtd2ViJzogW3sgbmFtZTogJ3VybCcsIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnIH1dLFxuICAnc3ZlbHRla2l0LXdlYic6IFt7IG5hbWU6ICd1cmwnLCBkZXNjcmlwdGlvbjogJ1dlYnNpdGUgVVJMJyB9XSxcbiAgJ3NvbGlkc3RhcnQtd2ViJzogW3sgbmFtZTogJ3VybCcsIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnIH1dLFxuICAndGFuc3RhY2std2ViJzogW3sgbmFtZTogJ3VybCcsIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnIH1dLFxuICAncmVtaXgtd2ViJzogW3sgbmFtZTogJ3VybCcsIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnIH1dLFxuICAnbXVsdGktY29udGFpbmVyLXdvcmtsb2FkJzogW3sgbmFtZTogJ2xvZ0dyb3VwQXJuJywgZGVzY3JpcHRpb246ICdMb2cgZ3JvdXAgQVJOJyB9XSxcbiAgJ3Nxcy1xdWV1ZSc6IFtcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ1F1ZXVlIEFSTicgfSxcbiAgICB7IG5hbWU6ICd1cmwnLCBkZXNjcmlwdGlvbjogJ1F1ZXVlIFVSTCcgfSxcbiAgICB7IG5hbWU6ICduYW1lJywgZGVzY3JpcHRpb246ICdRdWV1ZSBuYW1lJyB9XG4gIF0sXG4gICdzbnMtdG9waWMnOiBbXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdUb3BpYyBBUk4nIH0sXG4gICAgeyBuYW1lOiAnbmFtZScsIGRlc2NyaXB0aW9uOiAnVG9waWMgbmFtZScgfVxuICBdXG59O1xuIiwKICAgICJpbXBvcnQgdHlwZSB7IFJlc291cmNlQ2xhc3NOYW1lIH0gZnJvbSAnLi9jbGFzcy1jb25maWcnO1xuaW1wb3J0IHsgUkVTT1VSQ0VTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMgfSBmcm9tICcuL2NsYXNzLWNvbmZpZyc7XG5pbXBvcnQgeyBCYXNlUmVzb3VyY2UgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgeyBSRUZFUkVOQ0VBQkxFX1BBUkFNUyB9IGZyb20gJy4vcmVzb3VyY2UtbWV0YWRhdGEnO1xuXG4vLyBQcml2YXRlIHN5bWJvbCBmb3IgYWNjZXNzaW5nIHRoZSBpbnRlcm5hbCBwYXJhbSByZWZlcmVuY2UgbWV0aG9kXG5jb25zdCBnZXRQYXJhbVJlZmVyZW5jZVN5bWJvbCA9IFN5bWJvbC5mb3IoJ3N0YWNrdGFwZTpnZXRQYXJhbVJlZmVyZW5jZScpO1xuXG4vKipcbiAqIEZhY3RvcnkgZnVuY3Rpb24gdG8gY3JlYXRlIGEgcmVzb3VyY2UgY2xhc3Mgd2l0aCByZWZlcmVuY2VhYmxlIHBhcmFtZXRlcnMuXG4gKiBTdXBwb3J0cyB0d28gY2FsbGluZyBjb252ZW50aW9uczpcbiAqIC0gbmV3IFJlc291cmNlKHByb3BlcnRpZXMpIC0gbmFtZSBkZXJpdmVkIGZyb20gb2JqZWN0IGtleSBpbiByZXNvdXJjZXNcbiAqIC0gbmV3IFJlc291cmNlKG5hbWUsIHByb3BlcnRpZXMpIC0gZXhwbGljaXQgbmFtZSAoYmFja3dhcmRzIGNvbXBhdGlibGUpXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVJlc291cmNlQ2xhc3MoY2xhc3NOYW1lOiBSZXNvdXJjZUNsYXNzTmFtZSwgcmVzb3VyY2VUeXBlOiBzdHJpbmcpOiBhbnkge1xuICAvLyBDcmVhdGUgdGhlIGNsYXNzIGR5bmFtaWNhbGx5XG4gIGNvbnN0IFJlc291cmNlQ2xhc3MgPSBjbGFzcyBleHRlbmRzIEJhc2VSZXNvdXJjZSB7XG4gICAgY29uc3RydWN0b3IobmFtZU9yUHJvcGVydGllczogc3RyaW5nIHwgYW55LCBwcm9wZXJ0aWVzPzogYW55KSB7XG4gICAgICBpZiAodHlwZW9mIG5hbWVPclByb3BlcnRpZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIC8vIE9sZCBzdHlsZTogKG5hbWUsIHByb3BlcnRpZXMpIC0gZXhwbGljaXQgbmFtZVxuICAgICAgICBzdXBlcihuYW1lT3JQcm9wZXJ0aWVzLCByZXNvdXJjZVR5cGUsIHByb3BlcnRpZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gTmV3IHN0eWxlOiAocHJvcGVydGllcykgLSBuYW1lIHdpbGwgYmUgc2V0IGZyb20gb2JqZWN0IGtleVxuICAgICAgICBzdXBlcih1bmRlZmluZWQsIHJlc291cmNlVHlwZSwgbmFtZU9yUHJvcGVydGllcyk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIFNldCB0aGUgY2xhc3MgbmFtZSBmb3IgYmV0dGVyIGRlYnVnZ2luZ1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUmVzb3VyY2VDbGFzcywgJ25hbWUnLCB7IHZhbHVlOiBjbGFzc05hbWUgfSk7XG5cbiAgLy8gQWRkIHJlZmVyZW5jZWFibGUgcGFyYW1ldGVyIGdldHRlcnNcbiAgY29uc3QgcmVmZXJlbmNlYWJsZVBhcmFtcyA9IFJFRkVSRU5DRUFCTEVfUEFSQU1TW3Jlc291cmNlVHlwZV0gfHwgW107XG4gIGZvciAoY29uc3QgcGFyYW0gb2YgcmVmZXJlbmNlYWJsZVBhcmFtcykge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShSZXNvdXJjZUNsYXNzLnByb3RvdHlwZSwgcGFyYW0ubmFtZSwge1xuICAgICAgZ2V0KHRoaXM6IEJhc2VSZXNvdXJjZSkge1xuICAgICAgICByZXR1cm4gKHRoaXMgYXMgYW55KVtnZXRQYXJhbVJlZmVyZW5jZVN5bWJvbF0ocGFyYW0ubmFtZSk7XG4gICAgICB9LFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBSZXNvdXJjZUNsYXNzO1xufVxuXG4vLyBDcmVhdGUgYWxsIHJlc291cmNlIGNsYXNzZXMgZnJvbSBjb25maWdcbmNvbnN0IFJFU09VUkNFX0NMQVNTRVM6IFJlY29yZDxzdHJpbmcsIFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZVJlc291cmNlQ2xhc3M+PiA9IHt9O1xuZm9yIChjb25zdCBkZWYgb2YgUkVTT1VSQ0VTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMpIHtcbiAgLy8gVXNlICdMYW1iZGFGdW5jdGlvbicgYXMgdGhlIGV4cG9ydGVkIG5hbWUgZm9yICdGdW5jdGlvbicgdG8gYXZvaWQgSlMgcmVzZXJ2ZWQgd29yZCBpc3N1ZXNcbiAgUkVTT1VSQ0VfQ0xBU1NFU1tkZWYuY2xhc3NOYW1lIGFzIGFueV0gPSBjcmVhdGVSZXNvdXJjZUNsYXNzKGRlZi5jbGFzc05hbWUsIGRlZi5yZXNvdXJjZVR5cGUpO1xufVxuXG4vLyBFeHBvcnQgYWxsIHJlc291cmNlIGNsYXNzZXMgZm9yIG5hbWVkIGltcG9ydHNcbmV4cG9ydCBjb25zdCB7XG4gIFJlbGF0aW9uYWxEYXRhYmFzZSxcbiAgV2ViU2VydmljZSxcbiAgUHJpdmF0ZVNlcnZpY2UsXG4gIFdvcmtlclNlcnZpY2UsXG4gIE11bHRpQ29udGFpbmVyV29ya2xvYWQsXG4gIExhbWJkYUZ1bmN0aW9uLFxuICBCYXRjaEpvYixcbiAgQnVja2V0LFxuICBIb3N0aW5nQnVja2V0LFxuICBEeW5hbW9EYlRhYmxlLFxuICBFdmVudEJ1cyxcbiAgSHR0cEFwaUdhdGV3YXksXG4gIEFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyLFxuICBOZXR3b3JrTG9hZEJhbGFuY2VyLFxuICBSZWRpc0NsdXN0ZXIsXG4gIE1vbmdvRGJBdGxhc0NsdXN0ZXIsXG4gIFN0YXRlTWFjaGluZSxcbiAgVXNlckF1dGhQb29sLFxuICBVcHN0YXNoUmVkaXMsXG4gIFNxc1F1ZXVlLFxuICBTbnNUb3BpYyxcbiAgS2luZXNpc1N0cmVhbSxcbiAgV2ViQXBwRmlyZXdhbGwsXG4gIE9wZW5TZWFyY2hEb21haW4sXG4gIEVmc0ZpbGVzeXN0ZW0sXG4gIE5leHRqc1dlYixcbiAgQmFzdGlvblxufSA9IFJFU09VUkNFX0NMQVNTRVM7XG4iLAogICAgImltcG9ydCB7IE1JU0NfVFlQRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUyB9IGZyb20gJy4vY2xhc3MtY29uZmlnJztcbmltcG9ydCB7IEJhc2VUeXBlUHJvcGVydGllcywgQmFzZVR5cGVPbmx5IH0gZnJvbSAnLi9jb25maWcnO1xuXG5mdW5jdGlvbiBjcmVhdGVUeXBlUHJvcGVydGllc0NsYXNzKGNsYXNzTmFtZTogc3RyaW5nLCB0eXBlVmFsdWU6IHN0cmluZywgdHlwZU9ubHk/OiBib29sZWFuKTogYW55IHtcbiAgaWYgKHR5cGVPbmx5KSB7XG4gICAgY29uc3QgVHlwZU9ubHlDbGFzcyA9IGNsYXNzIGV4dGVuZHMgQmFzZVR5cGVPbmx5IHtcbiAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcih0eXBlVmFsdWUpO1xuICAgICAgfVxuICAgIH07XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFR5cGVPbmx5Q2xhc3MsICduYW1lJywgeyB2YWx1ZTogY2xhc3NOYW1lIH0pO1xuICAgIHJldHVybiBUeXBlT25seUNsYXNzO1xuICB9XG5cbiAgY29uc3QgVHlwZVByb3BlcnRpZXNDbGFzcyA9IGNsYXNzIGV4dGVuZHMgQmFzZVR5cGVQcm9wZXJ0aWVzIHtcbiAgICBjb25zdHJ1Y3Rvcihwcm9wZXJ0aWVzOiBhbnkpIHtcbiAgICAgIHN1cGVyKHR5cGVWYWx1ZSwgcHJvcGVydGllcyk7XG4gICAgfVxuICB9O1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShUeXBlUHJvcGVydGllc0NsYXNzLCAnbmFtZScsIHsgdmFsdWU6IGNsYXNzTmFtZSB9KTtcbiAgcmV0dXJuIFR5cGVQcm9wZXJ0aWVzQ2xhc3M7XG59XG5cbi8vIENyZWF0ZSBhbGwgdHlwZS1wcm9wZXJ0aWVzIGNsYXNzZXMgZnJvbSBjb25maWdcbmNvbnN0IFRZUEVfUFJPUEVSVElFU19DTEFTU0VTOiBSZWNvcmQ8c3RyaW5nLCBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVUeXBlUHJvcGVydGllc0NsYXNzPj4gPSB7fTtcbmZvciAoY29uc3QgZGVmIG9mIE1JU0NfVFlQRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUykge1xuICBUWVBFX1BST1BFUlRJRVNfQ0xBU1NFU1tkZWYuY2xhc3NOYW1lXSA9IGNyZWF0ZVR5cGVQcm9wZXJ0aWVzQ2xhc3MoZGVmLmNsYXNzTmFtZSwgZGVmLnR5cGVWYWx1ZSwgZGVmLnR5cGVPbmx5KTtcbn1cblxuLy8gRXhwb3J0IGFsbCBjbGFzc2VzIGZvciBuYW1lZCBpbXBvcnRzIChUeXBlU2NyaXB0IG5lZWRzIHRoZXNlIGV4cGxpY2l0IGV4cG9ydHMpXG5leHBvcnQgY29uc3Qge1xuICAvLyBEYXRhYmFzZSBFbmdpbmVzXG4gIFJkc0VuZ2luZVBvc3RncmVzLFxuICBSZHNFbmdpbmVNYXJpYWRiLFxuICBSZHNFbmdpbmVNeXNxbCxcbiAgUmRzRW5naW5lT3JhY2xlRUUsXG4gIFJkc0VuZ2luZU9yYWNsZVNFMixcbiAgUmRzRW5naW5lU3FsU2VydmVyRUUsXG4gIFJkc0VuZ2luZVNxbFNlcnZlckVYLFxuICBSZHNFbmdpbmVTcWxTZXJ2ZXJTRSxcbiAgUmRzRW5naW5lU3FsU2VydmVyV2ViLFxuICBBdXJvcmFFbmdpbmVQb3N0Z3Jlc3FsLFxuICBBdXJvcmFFbmdpbmVNeXNxbCxcbiAgQXVyb3JhU2VydmVybGVzc0VuZ2luZVBvc3RncmVzcWwsXG4gIEF1cm9yYVNlcnZlcmxlc3NFbmdpbmVNeXNxbCxcbiAgQXVyb3JhU2VydmVybGVzc1YyRW5naW5lUG9zdGdyZXNxbCxcbiAgQXVyb3JhU2VydmVybGVzc1YyRW5naW5lTXlzcWwsXG4gIC8vIExhbWJkYSBQYWNrYWdpbmdcbiAgU3RhY2t0YXBlTGFtYmRhQnVpbGRwYWNrUGFja2FnaW5nLFxuICBDdXN0b21BcnRpZmFjdExhbWJkYVBhY2thZ2luZyxcbiAgLy8gQ29udGFpbmVyIFBhY2thZ2luZ1xuICBQcmVidWlsdEltYWdlUGFja2FnaW5nLFxuICBDdXN0b21Eb2NrZXJmaWxlUGFja2FnaW5nLFxuICBFeHRlcm5hbEJ1aWxkcGFja1BhY2thZ2luZyxcbiAgTml4cGFja3NQYWNrYWdpbmcsXG4gIFN0YWNrdGFwZUltYWdlQnVpbGRwYWNrUGFja2FnaW5nLFxuICAvLyBMYW1iZGEgRnVuY3Rpb24gRXZlbnRzL0ludGVncmF0aW9uc1xuICBIdHRwQXBpSW50ZWdyYXRpb24sXG4gIFMzSW50ZWdyYXRpb24sXG4gIFNjaGVkdWxlSW50ZWdyYXRpb24sXG4gIFNuc0ludGVncmF0aW9uLFxuICBTcXNJbnRlZ3JhdGlvbixcbiAgS2luZXNpc0ludGVncmF0aW9uLFxuICBEeW5hbW9EYkludGVncmF0aW9uLFxuICBDbG91ZHdhdGNoTG9nSW50ZWdyYXRpb24sXG4gIEFwcGxpY2F0aW9uTG9hZEJhbGFuY2VySW50ZWdyYXRpb24sXG4gIEV2ZW50QnVzSW50ZWdyYXRpb24sXG4gIEthZmthVG9waWNJbnRlZ3JhdGlvbixcbiAgQWxhcm1JbnRlZ3JhdGlvbixcbiAgSW90SW50ZWdyYXRpb24sXG4gIC8vIENETiBSb3V0ZXNcbiAgQ2RuTG9hZEJhbGFuY2VyUm91dGUsXG4gIENkbkh0dHBBcGlHYXRld2F5Um91dGUsXG4gIENkbkxhbWJkYUZ1bmN0aW9uUm91dGUsXG4gIENkbkN1c3RvbURvbWFpblJvdXRlLFxuICBDZG5CdWNrZXRSb3V0ZSxcbiAgLy8gV2ViIEFwcCBGaXJld2FsbCBSdWxlc1xuICBNYW5hZ2VkUnVsZUdyb3VwLFxuICBDdXN0b21SdWxlR3JvdXAsXG4gIFJhdGVCYXNlZFJ1bGUsXG4gIC8vIFNRUyBRdWV1ZSBJbnRlZ3JhdGlvbnNcbiAgU3FzUXVldWVFdmVudEJ1c0ludGVncmF0aW9uLFxuICAvLyBNdWx0aSBDb250YWluZXIgV29ya2xvYWQgSW50ZWdyYXRpb25zXG4gIE11bHRpQ29udGFpbmVyV29ya2xvYWRIdHRwQXBpSW50ZWdyYXRpb24sXG4gIE11bHRpQ29udGFpbmVyV29ya2xvYWRMb2FkQmFsYW5jZXJJbnRlZ3JhdGlvbixcbiAgTXVsdGlDb250YWluZXJXb3JrbG9hZE5ldHdvcmtMb2FkQmFsYW5jZXJJbnRlZ3JhdGlvbixcbiAgTXVsdGlDb250YWluZXJXb3JrbG9hZEludGVybmFsSW50ZWdyYXRpb24sXG4gIE11bHRpQ29udGFpbmVyV29ya2xvYWRTZXJ2aWNlQ29ubmVjdEludGVncmF0aW9uLFxuICAvLyBTY3JpcHRzXG4gIExvY2FsU2NyaXB0LFxuICBCYXN0aW9uU2NyaXB0LFxuICBMb2NhbFNjcmlwdFdpdGhCYXN0aW9uVHVubmVsaW5nLFxuICAvLyBMb2cgRm9yd2FyZGluZ1xuICBIdHRwRW5kcG9pbnRMb2dGb3J3YXJkaW5nLFxuICBIaWdobGlnaHRMb2dGb3J3YXJkaW5nLFxuICBEYXRhZG9nTG9nRm9yd2FyZGluZyxcbiAgLy8gQnVja2V0IExpZmVjeWNsZSBSdWxlc1xuICBFeHBpcmF0aW9uTGlmZWN5Y2xlUnVsZSxcbiAgTm9uQ3VycmVudFZlcnNpb25FeHBpcmF0aW9uTGlmZWN5Y2xlUnVsZSxcbiAgLy8gRUZTIE1vdW50c1xuICBDb250YWluZXJFZnNNb3VudCxcbiAgTGFtYmRhRWZzTW91bnQsXG4gIC8vIEF1dGhvcml6ZXJzXG4gIENvZ25pdG9BdXRob3JpemVyLFxuICBMYW1iZGFBdXRob3JpemVyLFxuICAvLyBBbGFybSBUcmlnZ2Vyc1xuICBBcHBsaWNhdGlvbkxvYWRCYWxhbmNlckN1c3RvbVRyaWdnZXIsXG4gIEFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyRXJyb3JSYXRlVHJpZ2dlcixcbiAgQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJVbmhlYWx0aHlUYXJnZXRzVHJpZ2dlcixcbiAgSHR0cEFwaUdhdGV3YXlFcnJvclJhdGVUcmlnZ2VyLFxuICBIdHRwQXBpR2F0ZXdheUxhdGVuY3lUcmlnZ2VyLFxuICBSZWxhdGlvbmFsRGF0YWJhc2VSZWFkTGF0ZW5jeVRyaWdnZXIsXG4gIFJlbGF0aW9uYWxEYXRhYmFzZVdyaXRlTGF0ZW5jeVRyaWdnZXIsXG4gIFJlbGF0aW9uYWxEYXRhYmFzZUNQVVV0aWxpemF0aW9uVHJpZ2dlcixcbiAgUmVsYXRpb25hbERhdGFiYXNlRnJlZVN0b3JhZ2VUcmlnZ2VyLFxuICBSZWxhdGlvbmFsRGF0YWJhc2VGcmVlTWVtb3J5VHJpZ2dlcixcbiAgUmVsYXRpb25hbERhdGFiYXNlQ29ubmVjdGlvbkNvdW50VHJpZ2dlcixcbiAgU3FzUXVldWVSZWNlaXZlZE1lc3NhZ2VzQ291bnRUcmlnZ2VyLFxuICBTcXNRdWV1ZU5vdEVtcHR5VHJpZ2dlcixcbiAgTGFtYmRhRXJyb3JSYXRlVHJpZ2dlcixcbiAgTGFtYmRhRHVyYXRpb25UcmlnZ2VyLFxuICAvLyBDdXN0b20gUmVzb3VyY2VzXG4gIEN1c3RvbVJlc291cmNlRGVmaW5pdGlvbixcbiAgQ3VzdG9tUmVzb3VyY2VJbnN0YW5jZSxcbiAgLy8gRGVwbG95bWVudCBTY3JpcHRzXG4gIERlcGxveW1lbnRTY3JpcHQsXG4gIC8vIEVkZ2UgTGFtYmRhIEZ1bmN0aW9uc1xuICBFZGdlTGFtYmRhRnVuY3Rpb25cbn0gPSBUWVBFX1BST1BFUlRJRVNfQ0xBU1NFUztcbiIKICBdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLElBQU0sdUJBQXVCO0FBQzdCLElBQU0sdUJBQXVCO0FBRTdCLElBQU0sMkJBQTJCO0FBRWpDLElBQU0sdUJBQXVCO0FBRTdCLElBQU0sc0JBQXNCO0FBRTVC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QSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixtQkFBbUI7QUFBQSxJQUNuQixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osbUJBQW1CO0FBQUEsSUFDbkIsY0FBYztBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osbUJBQW1CO0FBQUEsSUFDbkIsY0FBYztBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNG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O0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjLENBQUM7QUFBQSxFQUNqQjtBQUNGO0FBaUJPLElBQU0sb0NBQWdFO0FBQUEsRUFFM0U7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBRUE7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBRUE7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNY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QUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBRUE7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBRUE7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUVBO0FBQUEsRUFDQTtBQUFBLEVBRUE7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFFQTtBQUFBLEVBQ0E7QUFBQSxFQUVBO0FBQUEsRUFFQTtBQUFBLElBQ0U7IiwKICAiZGVidWdJZCI6ICI1OERDMjBEMDYwREFFM0FBNjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
