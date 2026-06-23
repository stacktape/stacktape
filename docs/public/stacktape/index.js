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
  LambdaS3FilesMount: () => LambdaS3FilesMount,
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
  AwsCdkConstruct: () => AwsCdkConstruct,
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
  AgentCoreRuntime: () => AgentCoreRuntime,
  AgentCoreMemory: () => AgentCoreMemory,
  AgentCoreGateway: () => AgentCoreGateway,
  AgentCoreCodeInterpreter: () => AgentCoreCodeInterpreter,
  AgentCoreBrowser: () => AgentCoreBrowser,
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
  agentCoreRuntime(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::BedrockAgentCore::Runtime" }
    });
  },
  agentCoreRuntimeEndpoint(stpResourceName, endpointName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: endpointName },
      suffix: { cloudformationResourceType: "AWS::BedrockAgentCore::RuntimeEndpoint" }
    });
  },
  agentCoreRuntimeRole(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "AgentCoreRuntime" },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  agentCoreMemory(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::BedrockAgentCore::Memory" }
    });
  },
  agentCoreGateway(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::BedrockAgentCore::Gateway" }
    });
  },
  agentCoreGatewayRole(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "AgentCoreGateway" },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  agentCoreGatewayTarget(stpResourceName, targetName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: targetName },
      suffix: { cloudformationResourceType: "AWS::BedrockAgentCore::GatewayTarget" }
    });
  },
  agentCoreBrowser(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::BedrockAgentCore::BrowserCustom" }
    });
  },
  agentCoreBrowserRole(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "AgentCoreBrowser" },
      suffix: { cloudformationResourceType: "AWS::IAM::Role" }
    });
  },
  agentCoreCodeInterpreter(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      suffix: { cloudformationResourceType: "AWS::BedrockAgentCore::CodeInterpreterCustom" }
    });
  },
  agentCoreCodeInterpreterRole(stpResourceName) {
    return buildCfLogicalName({
      stpResourceName,
      specifier: { type: "AgentCoreCodeInterpreter" },
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
  "agentcore-runtime": [
    { logicalName: cfLogicalNames.agentCoreRuntimeRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.workloadSecurityGroup, resourceType: "AWS::EC2::SecurityGroup", conditional: true },
    { logicalName: cfLogicalNames.agentCoreRuntime, resourceType: "AWS::BedrockAgentCore::Runtime" },
    {
      logicalName: cfLogicalNames.agentCoreRuntimeEndpoint,
      resourceType: "AWS::BedrockAgentCore::RuntimeEndpoint",
      conditional: true,
      unresolvable: true
    }
  ],
  "agentcore-memory": [{ logicalName: cfLogicalNames.agentCoreMemory, resourceType: "AWS::BedrockAgentCore::Memory" }],
  "agentcore-gateway": [
    { logicalName: cfLogicalNames.agentCoreGatewayRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.agentCoreGateway, resourceType: "AWS::BedrockAgentCore::Gateway" },
    {
      logicalName: cfLogicalNames.agentCoreGatewayTarget,
      resourceType: "AWS::BedrockAgentCore::GatewayTarget",
      conditional: true,
      unresolvable: true
    }
  ],
  "agentcore-browser": [
    { logicalName: cfLogicalNames.agentCoreBrowserRole, resourceType: "AWS::IAM::Role" },
    { logicalName: cfLogicalNames.agentCoreBrowser, resourceType: "AWS::BedrockAgentCore::BrowserCustom" }
  ],
  "agentcore-code-interpreter": [
    { logicalName: cfLogicalNames.agentCoreCodeInterpreterRole, resourceType: "AWS::IAM::Role" },
    {
      logicalName: cfLogicalNames.agentCoreCodeInterpreter,
      resourceType: "AWS::BedrockAgentCore::CodeInterpreterCustom"
    }
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
var $GitInfo = (property) => {
  return `$GitInfo('${property}')`;
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
    className: "Convex",
    resourceType: "convex",
    propsType: "ConvexProps",
    interfaceName: "Convex",
    sourceFile: "convex.d.ts",
    canConnectTo: []
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
  },
  {
    className: "AgentCoreRuntime",
    resourceType: "agentcore-runtime",
    propsType: "AgentCoreRuntimeProps",
    interfaceName: "AgentCoreRuntime",
    sourceFile: "agentcore.d.ts",
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
    className: "AgentCoreMemory",
    resourceType: "agentcore-memory",
    propsType: "AgentCoreMemoryProps",
    interfaceName: "AgentCoreMemory",
    sourceFile: "agentcore.d.ts",
    canConnectTo: []
  },
  {
    className: "AgentCoreGateway",
    resourceType: "agentcore-gateway",
    propsType: "AgentCoreGatewayProps",
    interfaceName: "AgentCoreGateway",
    sourceFile: "agentcore.d.ts",
    canConnectTo: []
  },
  {
    className: "AgentCoreBrowser",
    resourceType: "agentcore-browser",
    propsType: "AgentCoreBrowserProps",
    interfaceName: "AgentCoreBrowser",
    sourceFile: "agentcore.d.ts",
    canConnectTo: []
  },
  {
    className: "AgentCoreCodeInterpreter",
    resourceType: "agentcore-code-interpreter",
    propsType: "AgentCoreCodeInterpreterProps",
    interfaceName: "AgentCoreCodeInterpreter",
    sourceFile: "agentcore.d.ts",
    canConnectTo: []
  },
  {
    className: "AwsCdkConstruct",
    resourceType: "aws-cdk-construct",
    propsType: "AwsCdkConstructProps",
    interfaceName: "AwsCdkConstruct",
    sourceFile: "aws-cdk-construct.d.ts",
    supportsOverrides: false,
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
    typeValue: "kinesis-stream",
    propsType: "KinesisIntegrationProps",
    interfaceName: "KinesisIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "DynamoDbIntegration",
    typeValue: "dynamo-db-stream",
    propsType: "DynamoDbIntegrationProps",
    interfaceName: "DynamoDbIntegration",
    sourceFile: "events.d.ts"
  },
  {
    className: "CloudwatchLogIntegration",
    typeValue: "cloudwatch-log",
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
    typeValue: "cloudwatch-alarm",
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
    className: "LambdaS3FilesMount",
    typeValue: "s3files",
    propsType: "LambdaS3FilesMountProps",
    interfaceName: "LambdaS3FilesMount",
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
  ],
  "agentcore-runtime": [
    { name: "id", description: "AgentCore runtime ID" },
    { name: "arn", description: "AgentCore runtime ARN" },
    { name: "endpointName", description: "Default runtime endpoint name" },
    { name: "endpointArn", description: "Default runtime endpoint ARN" }
  ],
  "agentcore-memory": [
    { name: "id", description: "AgentCore memory ID" },
    { name: "arn", description: "AgentCore memory ARN" }
  ],
  "agentcore-gateway": [
    { name: "id", description: "AgentCore gateway ID" },
    { name: "arn", description: "AgentCore gateway ARN" },
    { name: "url", description: "AgentCore gateway URL" }
  ],
  "agentcore-browser": [
    { name: "id", description: "AgentCore browser ID" },
    { name: "arn", description: "AgentCore browser ARN" }
  ],
  "agentcore-code-interpreter": [
    { name: "id", description: "AgentCore code interpreter ID" },
    { name: "arn", description: "AgentCore code interpreter ARN" }
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
  Bastion,
  AgentCoreRuntime,
  AgentCoreMemory,
  AgentCoreGateway,
  AgentCoreBrowser,
  AgentCoreCodeInterpreter,
  AwsCdkConstruct
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
  LambdaS3FilesMount,
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

//# debugId=8B91051FDC3E279164756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi5cXG5vZGVfbW9kdWxlc1xcY2hhbmdlLWNhc2VcXGRpc3RcXGluZGV4LmpzIiwgIi4uXFxzaGFyZWRcXG5hbWluZ1xcbG9naWNhbC1uYW1lcy50cyIsICIuLlxcc3JjXFxhcGlcXG5wbVxcdHNcXGNoaWxkLXJlc291cmNlcy50cyIsICIuLlxcc3JjXFxhcGlcXG5wbVxcdHNcXGNvbmZpZy50cyIsICIuLlxcc3JjXFxhcGlcXG5wbVxcdHNcXGRpcmVjdGl2ZXMudHMiLCAiLi5cXHNyY1xcYXBpXFxucG1cXHRzXFxnbG9iYWwtYXdzLXNlcnZpY2VzLnRzIiwgIi4uXFxzcmNcXGFwaVxcbnBtXFx0c1xcY2xhc3MtY29uZmlnLnRzIiwgIi4uXFxzcmNcXGFwaVxcbnBtXFx0c1xccmVzb3VyY2UtbWV0YWRhdGEudHMiLCAiLi5cXHNyY1xcYXBpXFxucG1cXHRzXFxyZXNvdXJjZXMudHMiLCAiLi5cXHNyY1xcYXBpXFxucG1cXHRzXFx0eXBlLXByb3BlcnRpZXMudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiLy8gUmVnZXhwcyBpbnZvbHZlZCB3aXRoIHNwbGl0dGluZyB3b3JkcyBpbiB2YXJpb3VzIGNhc2UgZm9ybWF0cy5cbmNvbnN0IFNQTElUX0xPV0VSX1VQUEVSX1JFID0gLyhbXFxwe0xsfVxcZF0pKFxccHtMdX0pL2d1O1xuY29uc3QgU1BMSVRfVVBQRVJfVVBQRVJfUkUgPSAvKFxccHtMdX0pKFtcXHB7THV9XVtcXHB7TGx9XSkvZ3U7XG4vLyBVc2VkIHRvIGl0ZXJhdGUgb3ZlciB0aGUgaW5pdGlhbCBzcGxpdCByZXN1bHQgYW5kIHNlcGFyYXRlIG51bWJlcnMuXG5jb25zdCBTUExJVF9TRVBBUkFURV9OVU1CRVJfUkUgPSAvKFxcZClcXHB7TGx9fChcXHB7TH0pXFxkL3U7XG4vLyBSZWdleHAgaW52b2x2ZWQgd2l0aCBzdHJpcHBpbmcgbm9uLXdvcmQgY2hhcmFjdGVycyBmcm9tIHRoZSByZXN1bHQuXG5jb25zdCBERUZBVUxUX1NUUklQX1JFR0VYUCA9IC9bXlxccHtMfVxcZF0rL2dpdTtcbi8vIFRoZSByZXBsYWNlbWVudCB2YWx1ZSBmb3Igc3BsaXRzLlxuY29uc3QgU1BMSVRfUkVQTEFDRV9WQUxVRSA9IFwiJDFcXDAkMlwiO1xuLy8gVGhlIGRlZmF1bHQgY2hhcmFjdGVycyB0byBrZWVwIGFmdGVyIHRyYW5zZm9ybWluZyBjYXNlLlxuY29uc3QgREVGQVVMVF9QUkVGSVhfU1VGRklYX0NIQVJBQ1RFUlMgPSBcIlwiO1xuLyoqXG4gKiBTcGxpdCBhbnkgY2FzZWQgaW5wdXQgc3RyaW5ncyBpbnRvIGFuIGFycmF5IG9mIHdvcmRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3BsaXQodmFsdWUpIHtcbiAgICBsZXQgcmVzdWx0ID0gdmFsdWUudHJpbSgpO1xuICAgIHJlc3VsdCA9IHJlc3VsdFxuICAgICAgICAucmVwbGFjZShTUExJVF9MT1dFUl9VUFBFUl9SRSwgU1BMSVRfUkVQTEFDRV9WQUxVRSlcbiAgICAgICAgLnJlcGxhY2UoU1BMSVRfVVBQRVJfVVBQRVJfUkUsIFNQTElUX1JFUExBQ0VfVkFMVUUpO1xuICAgIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKERFRkFVTFRfU1RSSVBfUkVHRVhQLCBcIlxcMFwiKTtcbiAgICBsZXQgc3RhcnQgPSAwO1xuICAgIGxldCBlbmQgPSByZXN1bHQubGVuZ3RoO1xuICAgIC8vIFRyaW0gdGhlIGRlbGltaXRlciBmcm9tIGFyb3VuZCB0aGUgb3V0cHV0IHN0cmluZy5cbiAgICB3aGlsZSAocmVzdWx0LmNoYXJBdChzdGFydCkgPT09IFwiXFwwXCIpXG4gICAgICAgIHN0YXJ0Kys7XG4gICAgaWYgKHN0YXJ0ID09PSBlbmQpXG4gICAgICAgIHJldHVybiBbXTtcbiAgICB3aGlsZSAocmVzdWx0LmNoYXJBdChlbmQgLSAxKSA9PT0gXCJcXDBcIilcbiAgICAgICAgZW5kLS07XG4gICAgcmV0dXJuIHJlc3VsdC5zbGljZShzdGFydCwgZW5kKS5zcGxpdCgvXFwwL2cpO1xufVxuLyoqXG4gKiBTcGxpdCB0aGUgaW5wdXQgc3RyaW5nIGludG8gYW4gYXJyYXkgb2Ygd29yZHMsIHNlcGFyYXRpbmcgbnVtYmVycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNwbGl0U2VwYXJhdGVOdW1iZXJzKHZhbHVlKSB7XG4gICAgY29uc3Qgd29yZHMgPSBzcGxpdCh2YWx1ZSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB3b3Jkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB3b3JkID0gd29yZHNbaV07XG4gICAgICAgIGNvbnN0IG1hdGNoID0gU1BMSVRfU0VQQVJBVEVfTlVNQkVSX1JFLmV4ZWMod29yZCk7XG4gICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gbWF0Y2guaW5kZXggKyAobWF0Y2hbMV0gPz8gbWF0Y2hbMl0pLmxlbmd0aDtcbiAgICAgICAgICAgIHdvcmRzLnNwbGljZShpLCAxLCB3b3JkLnNsaWNlKDAsIG9mZnNldCksIHdvcmQuc2xpY2Uob2Zmc2V0KSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHdvcmRzO1xufVxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIHRvIHNwYWNlIHNlcGFyYXRlZCBsb3dlciBjYXNlIChgZm9vIGJhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9DYXNlKGlucHV0LCBvcHRpb25zKSB7XG4gICAgY29uc3QgW3ByZWZpeCwgd29yZHMsIHN1ZmZpeF0gPSBzcGxpdFByZWZpeFN1ZmZpeChpbnB1dCwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIChwcmVmaXggK1xuICAgICAgICB3b3Jkcy5tYXAobG93ZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSkpLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiIFwiKSArXG4gICAgICAgIHN1ZmZpeCk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8gY2FtZWwgY2FzZSAoYGZvb0JhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FtZWxDYXNlKGlucHV0LCBvcHRpb25zKSB7XG4gICAgY29uc3QgW3ByZWZpeCwgd29yZHMsIHN1ZmZpeF0gPSBzcGxpdFByZWZpeFN1ZmZpeChpbnB1dCwgb3B0aW9ucyk7XG4gICAgY29uc3QgbG93ZXIgPSBsb3dlckZhY3Rvcnkob3B0aW9ucz8ubG9jYWxlKTtcbiAgICBjb25zdCB1cHBlciA9IHVwcGVyRmFjdG9yeShvcHRpb25zPy5sb2NhbGUpO1xuICAgIGNvbnN0IHRyYW5zZm9ybSA9IG9wdGlvbnM/Lm1lcmdlQW1iaWd1b3VzQ2hhcmFjdGVyc1xuICAgICAgICA/IGNhcGl0YWxDYXNlVHJhbnNmb3JtRmFjdG9yeShsb3dlciwgdXBwZXIpXG4gICAgICAgIDogcGFzY2FsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKTtcbiAgICByZXR1cm4gKHByZWZpeCArXG4gICAgICAgIHdvcmRzXG4gICAgICAgICAgICAubWFwKCh3b3JkLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGluZGV4ID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBsb3dlcih3b3JkKTtcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm0od29yZCwgaW5kZXgpO1xuICAgICAgICB9KVxuICAgICAgICAgICAgLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiXCIpICtcbiAgICAgICAgc3VmZml4KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBwYXNjYWwgY2FzZSAoYEZvb0JhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFzY2FsQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIGNvbnN0IFtwcmVmaXgsIHdvcmRzLCBzdWZmaXhdID0gc3BsaXRQcmVmaXhTdWZmaXgoaW5wdXQsIG9wdGlvbnMpO1xuICAgIGNvbnN0IGxvd2VyID0gbG93ZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSk7XG4gICAgY29uc3QgdXBwZXIgPSB1cHBlckZhY3Rvcnkob3B0aW9ucz8ubG9jYWxlKTtcbiAgICBjb25zdCB0cmFuc2Zvcm0gPSBvcHRpb25zPy5tZXJnZUFtYmlndW91c0NoYXJhY3RlcnNcbiAgICAgICAgPyBjYXBpdGFsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKVxuICAgICAgICA6IHBhc2NhbENhc2VUcmFuc2Zvcm1GYWN0b3J5KGxvd2VyLCB1cHBlcik7XG4gICAgcmV0dXJuIHByZWZpeCArIHdvcmRzLm1hcCh0cmFuc2Zvcm0pLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiXCIpICsgc3VmZml4O1xufVxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIHRvIHBhc2NhbCBzbmFrZSBjYXNlIChgRm9vX0JhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFzY2FsU25ha2VDYXNlKGlucHV0LCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIGNhcGl0YWxDYXNlKGlucHV0LCB7IGRlbGltaXRlcjogXCJfXCIsIC4uLm9wdGlvbnMgfSk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8gY2FwaXRhbCBjYXNlIChgRm9vIEJhcmApLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FwaXRhbENhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBbcHJlZml4LCB3b3Jkcywgc3VmZml4XSA9IHNwbGl0UHJlZml4U3VmZml4KGlucHV0LCBvcHRpb25zKTtcbiAgICBjb25zdCBsb3dlciA9IGxvd2VyRmFjdG9yeShvcHRpb25zPy5sb2NhbGUpO1xuICAgIGNvbnN0IHVwcGVyID0gdXBwZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSk7XG4gICAgcmV0dXJuIChwcmVmaXggK1xuICAgICAgICB3b3Jkc1xuICAgICAgICAgICAgLm1hcChjYXBpdGFsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKSlcbiAgICAgICAgICAgIC5qb2luKG9wdGlvbnM/LmRlbGltaXRlciA/PyBcIiBcIikgK1xuICAgICAgICBzdWZmaXgpO1xufVxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIHRvIGNvbnN0YW50IGNhc2UgKGBGT09fQkFSYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb25zdGFudENhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBbcHJlZml4LCB3b3Jkcywgc3VmZml4XSA9IHNwbGl0UHJlZml4U3VmZml4KGlucHV0LCBvcHRpb25zKTtcbiAgICByZXR1cm4gKHByZWZpeCArXG4gICAgICAgIHdvcmRzLm1hcCh1cHBlckZhY3Rvcnkob3B0aW9ucz8ubG9jYWxlKSkuam9pbihvcHRpb25zPy5kZWxpbWl0ZXIgPz8gXCJfXCIpICtcbiAgICAgICAgc3VmZml4KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBkb3QgY2FzZSAoYGZvby5iYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRvdENhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbm9DYXNlKGlucHV0LCB7IGRlbGltaXRlcjogXCIuXCIsIC4uLm9wdGlvbnMgfSk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8ga2ViYWIgY2FzZSAoYGZvby1iYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGtlYmFiQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBub0Nhc2UoaW5wdXQsIHsgZGVsaW1pdGVyOiBcIi1cIiwgLi4ub3B0aW9ucyB9KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBwYXRoIGNhc2UgKGBmb28vYmFyYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXRoQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBub0Nhc2UoaW5wdXQsIHsgZGVsaW1pdGVyOiBcIi9cIiwgLi4ub3B0aW9ucyB9KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBwYXRoIGNhc2UgKGBGb28gYmFyYCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZW50ZW5jZUNhc2UoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBbcHJlZml4LCB3b3Jkcywgc3VmZml4XSA9IHNwbGl0UHJlZml4U3VmZml4KGlucHV0LCBvcHRpb25zKTtcbiAgICBjb25zdCBsb3dlciA9IGxvd2VyRmFjdG9yeShvcHRpb25zPy5sb2NhbGUpO1xuICAgIGNvbnN0IHVwcGVyID0gdXBwZXJGYWN0b3J5KG9wdGlvbnM/LmxvY2FsZSk7XG4gICAgY29uc3QgdHJhbnNmb3JtID0gY2FwaXRhbENhc2VUcmFuc2Zvcm1GYWN0b3J5KGxvd2VyLCB1cHBlcik7XG4gICAgcmV0dXJuIChwcmVmaXggK1xuICAgICAgICB3b3Jkc1xuICAgICAgICAgICAgLm1hcCgod29yZCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnNmb3JtKHdvcmQpO1xuICAgICAgICAgICAgcmV0dXJuIGxvd2VyKHdvcmQpO1xuICAgICAgICB9KVxuICAgICAgICAgICAgLmpvaW4ob3B0aW9ucz8uZGVsaW1pdGVyID8/IFwiIFwiKSArXG4gICAgICAgIHN1ZmZpeCk7XG59XG4vKipcbiAqIENvbnZlcnQgYSBzdHJpbmcgdG8gc25ha2UgY2FzZSAoYGZvb19iYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNuYWtlQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBub0Nhc2UoaW5wdXQsIHsgZGVsaW1pdGVyOiBcIl9cIiwgLi4ub3B0aW9ucyB9KTtcbn1cbi8qKlxuICogQ29udmVydCBhIHN0cmluZyB0byBoZWFkZXIgY2FzZSAoYEZvby1CYXJgKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYWluQ2FzZShpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBjYXBpdGFsQ2FzZShpbnB1dCwgeyBkZWxpbWl0ZXI6IFwiLVwiLCAuLi5vcHRpb25zIH0pO1xufVxuZnVuY3Rpb24gbG93ZXJGYWN0b3J5KGxvY2FsZSkge1xuICAgIHJldHVybiBsb2NhbGUgPT09IGZhbHNlXG4gICAgICAgID8gKGlucHV0KSA9PiBpbnB1dC50b0xvd2VyQ2FzZSgpXG4gICAgICAgIDogKGlucHV0KSA9PiBpbnB1dC50b0xvY2FsZUxvd2VyQ2FzZShsb2NhbGUpO1xufVxuZnVuY3Rpb24gdXBwZXJGYWN0b3J5KGxvY2FsZSkge1xuICAgIHJldHVybiBsb2NhbGUgPT09IGZhbHNlXG4gICAgICAgID8gKGlucHV0KSA9PiBpbnB1dC50b1VwcGVyQ2FzZSgpXG4gICAgICAgIDogKGlucHV0KSA9PiBpbnB1dC50b0xvY2FsZVVwcGVyQ2FzZShsb2NhbGUpO1xufVxuZnVuY3Rpb24gY2FwaXRhbENhc2VUcmFuc2Zvcm1GYWN0b3J5KGxvd2VyLCB1cHBlcikge1xuICAgIHJldHVybiAod29yZCkgPT4gYCR7dXBwZXIod29yZFswXSl9JHtsb3dlcih3b3JkLnNsaWNlKDEpKX1gO1xufVxuZnVuY3Rpb24gcGFzY2FsQ2FzZVRyYW5zZm9ybUZhY3RvcnkobG93ZXIsIHVwcGVyKSB7XG4gICAgcmV0dXJuICh3b3JkLCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBjaGFyMCA9IHdvcmRbMF07XG4gICAgICAgIGNvbnN0IGluaXRpYWwgPSBpbmRleCA+IDAgJiYgY2hhcjAgPj0gXCIwXCIgJiYgY2hhcjAgPD0gXCI5XCIgPyBcIl9cIiArIGNoYXIwIDogdXBwZXIoY2hhcjApO1xuICAgICAgICByZXR1cm4gaW5pdGlhbCArIGxvd2VyKHdvcmQuc2xpY2UoMSkpO1xuICAgIH07XG59XG5mdW5jdGlvbiBzcGxpdFByZWZpeFN1ZmZpeChpbnB1dCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qgc3BsaXRGbiA9IG9wdGlvbnMuc3BsaXQgPz8gKG9wdGlvbnMuc2VwYXJhdGVOdW1iZXJzID8gc3BsaXRTZXBhcmF0ZU51bWJlcnMgOiBzcGxpdCk7XG4gICAgY29uc3QgcHJlZml4Q2hhcmFjdGVycyA9IG9wdGlvbnMucHJlZml4Q2hhcmFjdGVycyA/PyBERUZBVUxUX1BSRUZJWF9TVUZGSVhfQ0hBUkFDVEVSUztcbiAgICBjb25zdCBzdWZmaXhDaGFyYWN0ZXJzID0gb3B0aW9ucy5zdWZmaXhDaGFyYWN0ZXJzID8/IERFRkFVTFRfUFJFRklYX1NVRkZJWF9DSEFSQUNURVJTO1xuICAgIGxldCBwcmVmaXhJbmRleCA9IDA7XG4gICAgbGV0IHN1ZmZpeEluZGV4ID0gaW5wdXQubGVuZ3RoO1xuICAgIHdoaWxlIChwcmVmaXhJbmRleCA8IGlucHV0Lmxlbmd0aCkge1xuICAgICAgICBjb25zdCBjaGFyID0gaW5wdXQuY2hhckF0KHByZWZpeEluZGV4KTtcbiAgICAgICAgaWYgKCFwcmVmaXhDaGFyYWN0ZXJzLmluY2x1ZGVzKGNoYXIpKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIHByZWZpeEluZGV4Kys7XG4gICAgfVxuICAgIHdoaWxlIChzdWZmaXhJbmRleCA+IHByZWZpeEluZGV4KSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gc3VmZml4SW5kZXggLSAxO1xuICAgICAgICBjb25zdCBjaGFyID0gaW5wdXQuY2hhckF0KGluZGV4KTtcbiAgICAgICAgaWYgKCFzdWZmaXhDaGFyYWN0ZXJzLmluY2x1ZGVzKGNoYXIpKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIHN1ZmZpeEluZGV4ID0gaW5kZXg7XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICAgIGlucHV0LnNsaWNlKDAsIHByZWZpeEluZGV4KSxcbiAgICAgICAgc3BsaXRGbihpbnB1dC5zbGljZShwcmVmaXhJbmRleCwgc3VmZml4SW5kZXgpKSxcbiAgICAgICAgaW5wdXQuc2xpY2Uoc3VmZml4SW5kZXgpLFxuICAgIF07XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLAogICAgImltcG9ydCB0eXBlIHsgQ2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGUgfSBmcm9tICdAY2xvdWRmb3JtL3Jlc291cmNlLXR5cGVzJztcbmltcG9ydCB7IHBhc2NhbENhc2UgfSBmcm9tICdjaGFuZ2UtY2FzZSc7XG5cbmV4cG9ydCBjb25zdCBjZkxvZ2ljYWxOYW1lcyA9IHtcbiAgYnVja2V0KHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhc2NhbENhc2UoYCR7c3RwUmVzb3VyY2VOYW1lfS1idWNrZXRgKTtcbiAgfSxcbiAgYXRsYXNNb25nb1Byb2plY3QoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0F0bGFzTW9uZ28nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpQcm9qZWN0JyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29DcmVkZW50aWFsc1Byb3ZpZGVyKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBdGxhc01vbmdvQ3JlZGVudGlhbHNQcm92aWRlcicgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29Qcm9qZWN0VnBjTmV0d29ya0NvbnRhaW5lcigpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQXRsYXNNb25nbycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ01vbmdvREI6OlN0cEF0bGFzVjE6Ok5ldHdvcmtDb250YWluZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgYXRsYXNNb25nb1Byb2plY3RWcGNOZXR3b3JrUGVlcmluZygpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQXRsYXNNb25nbycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ01vbmdvREI6OlN0cEF0bGFzVjE6Ok5ldHdvcmtQZWVyaW5nJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29Qcm9qZWN0SXBBY2Nlc3NMaXN0KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBdGxhc01vbmdvJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6UHJvamVjdElwQWNjZXNzTGlzdCcgfVxuICAgIH0pO1xuICB9LFxuICBhdGxhc01vbmdvVXNlckFzc29jaWF0ZWRXaXRoUm9sZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBdGxhc01vbmdvJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6RGF0YWJhc2VVc2VyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29DbHVzdGVyTWFzdGVyVXNlcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6RGF0YWJhc2VVc2VyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF0bGFzTW9uZ29DbHVzdGVyKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpDbHVzdGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzUmVwbGljYXRpb25Hcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGlDYWNoZTo6UmVwbGljYXRpb25Hcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICByZWRpc0xvZ0dyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzUGFyYW1ldGVyR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpQ2FjaGU6OlBhcmFtZXRlckdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzU3VibmV0R3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpQ2FjaGU6OlN1Ym5ldEdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIHJlZGlzU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWZzRmlsZXN5c3RlbShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7XG4gICAgICAgIGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFRlM6OkZpbGVTeXN0ZW0nXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGVmc0FjY2Vzc1BvaW50KHtcbiAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgZWZzRmlsZXN5c3RlbU5hbWUsXG4gICAgcm9vdERpcmVjdG9yeVxuICB9OiB7XG4gICAgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmc7XG4gICAgZWZzRmlsZXN5c3RlbU5hbWU6IHN0cmluZztcbiAgICByb290RGlyZWN0b3J5Pzogc3RyaW5nO1xuICB9KSB7XG4gICAgLy8gQ3JlYXRlIGEgdW5pcXVlIGlkZW50aWZpZXIgYmFzZWQgb24gdGhlIHJvb3QgZGlyZWN0b3J5XG4gICAgY29uc3Qgcm9vdERpcklkZW50aWZpZXIgPSByb290RGlyZWN0b3J5ID8gYCR7cm9vdERpcmVjdG9yeS5yZXBsYWNlKC9cXC8vZywgJy0nKS5yZXBsYWNlKC9eLXwtJC9nLCAnJyl9YCA6ICdSb290JztcblxuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6IGAke2Vmc0ZpbGVzeXN0ZW1OYW1lfS0ke3Jvb3REaXJJZGVudGlmaWVyfWBcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHtcbiAgICAgICAgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6QWNjZXNzUG9pbnQnXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGVmc01vdW50VGFyZ2V0KHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBtb3VudFRhcmdldEluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU3VibmV0JywgdHlwZUluZGV4OiBtb3VudFRhcmdldEluZGV4IH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6TW91bnRUYXJnZXQnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWZzU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgc25zUm9sZVNlbmRTbXNGcm9tQ29nbml0byhzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdTZW5kU21zJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgY2xvdWRmcm9udERpc3RyaWJ1dGlvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZGlzdHJpYnV0aW9uSW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdDRE4nIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsIGluZGV4OiBkaXN0cmlidXRpb25JbmRleCB9XG4gICAgfSk7XG4gIH0sXG4gIGNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgY2FjaGluZ09wdGlvbnNIYXNoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgQ0ROQ2FjaGVCZWhhdmlvciR7Y2FjaGluZ09wdGlvbnNIYXNofWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knIH1cbiAgICB9KTtcbiAgfSxcbiAgY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSh0eXBlOiAnRGVmRHluYW1pYycgfCAnRGVmU3RhdGljJykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGBDRE4ke3R5cGV9YCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBjbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZm9yd2FyZGluZ09wdGlvbnNIYXNoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgQ0ROQ2FjaGVCZWhhdmlvciR7Zm9yd2FyZGluZ09wdGlvbnNIYXNofWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBjbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3kodHlwZTogJ0RlZkR5bmFtaWMnIHwgJ0RlZlN0YXRpYycpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgQ0ROJHt0eXBlfWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBjbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHkoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQ0ROJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknIH1cbiAgICB9KTtcbiAgfSxcbiAgb3Blbk5leHRIb3N0SGVhZGVyUmV3cml0ZUZ1bmN0aW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ09wZW5OZXh0SG9zdEhlYWRlclJld3JpdGUnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkZ1bmN0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIHNzcldlYkhvc3RIZWFkZXJSZXdyaXRlRnVuY3Rpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIHJlc291cmNlVHlwZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYCR7cmVzb3VyY2VUeXBlLnJlcGxhY2UoLy0vZywgJycpfUhvc3RIZWFkZXJSZXdyaXRlYCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpGdW5jdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBvcGVuTmV4dEFzc2V0UmVwbGFjZXJDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBc3NldFJlcGxhY2VyJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgb3Blbk5leHREeW5hbW9JbnNlcnRDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdEeW5hbW9JbnNlcnQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBkbnNSZWNvcmQoZnVsbHlRdWFsaWZpZWREb21haW5OYW1lOiBzdHJpbmcpIHtcbiAgICAvLyB3ZSBkbyBub3QgYnVpbGQgYnVpbGQgdGhlIHJlc291cmNlIG5hbWUgY29udmVudGlvbmFsbHkgdGhyb3VnaCBzdHBSZXNvdXJjZU5hbWVcbiAgICAvLyB0aGlzIGlzIGR1ZSB0byB1cGRhdGUgYmVoYXZpb3JzIG9mIENsb3VkZm9ybWF0aW9uXG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6ICcnLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGdldFNwZWNpZmllckZvckRvbWFpblJlc291cmNlKGZ1bGx5UXVhbGlmaWVkRG9tYWluTmFtZSkgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JyB9XG4gICAgfSk7XG4gIH0sXG4gIGR5bmFtb0dsb2JhbFRhYmxlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkR5bmFtb0RCOjpHbG9iYWxUYWJsZScgfVxuICAgIH0pO1xuICB9LFxuICBkeW5hbW9SZWdpb25hbFRhYmxlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkR5bmFtb0RCOjpUYWJsZScgfVxuICAgIH0pO1xuICB9LFxuICBidWNrZXRQb2xpY3koc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBldmVudE9uRGVsaXZlcnlGYWlsdXJlU3FzUXVldWVQb2xpY3koc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZVBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBzbnNFdmVudFN1YnNjcmlwdGlvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0V2ZW50JyxcbiAgICAgICAgdHlwZUluZGV4OiBldmVudEluZGV4XG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTTlM6OlN1YnNjcmlwdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBzbnNFdmVudFBlcm1pc3Npb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjclJlcG8oKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0NvbnRhaW5lcidcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDUjo6UmVwb3NpdG9yeScgfVxuICAgIH0pO1xuICB9LFxuICBkZXBsb3ltZW50QnVja2V0KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdEZXBsb3ltZW50J1xuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfVxuICAgIH0pO1xuICB9LFxuICBkZXBsb3ltZW50QnVja2V0UG9saWN5KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdEZXBsb3ltZW50J1xuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFJbnZva2VDb25maWcoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpFdmVudEludm9rZUNvbmZpZycgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFWZXJzaW9uUHVibGlzaGVyQ3VzdG9tUmVzb3VyY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnVmVyc2lvbicgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGNvZGVEZXBsb3lTZXJ2aWNlUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnQ29kZURlcGxveSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaEluc3RhbmNlUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnQmF0Y2hJbnN0YW5jZSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaEluc3RhbmNlRGVmYXVsdFNlY3VyaXR5R3JvdXAoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0JhdGNoSW5zdGFuY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hJbnN0YW5jZVByb2ZpbGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0JhdGNoSW5zdGFuY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaEluc3RhbmNlTGF1bmNoVGVtcGxhdGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0JhdGNoSW5zdGFuY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkxhdW5jaFRlbXBsYXRlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhdGNoU3RhdGVNYWNoaW5lRXhlY3V0aW9uUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnQmF0Y2hTdGF0ZU1hY2hpbmUnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hTcG90RmxlZXRSb2xlKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdCYXRjaFNwb3RGbGVldCdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBiYXRjaFNlcnZpY2VSb2xlKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdCYXRjaFNlcnZpY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hKb2JFeGVjdXRpb25Sb2xlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBhZ2VudENvcmVSdW50aW1lKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkJlZHJvY2tBZ2VudENvcmU6OlJ1bnRpbWUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYWdlbnRDb3JlUnVudGltZUVuZHBvaW50KHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBlbmRwb2ludE5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGVuZHBvaW50TmFtZSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpCZWRyb2NrQWdlbnRDb3JlOjpSdW50aW1lRW5kcG9pbnQnIH1cbiAgICB9KTtcbiAgfSxcbiAgYWdlbnRDb3JlUnVudGltZVJvbGUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQWdlbnRDb3JlUnVudGltZScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGFnZW50Q29yZU1lbW9yeShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpCZWRyb2NrQWdlbnRDb3JlOjpNZW1vcnknIH1cbiAgICB9KTtcbiAgfSxcbiAgYWdlbnRDb3JlR2F0ZXdheShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpCZWRyb2NrQWdlbnRDb3JlOjpHYXRld2F5JyB9XG4gICAgfSk7XG4gIH0sXG4gIGFnZW50Q29yZUdhdGV3YXlSb2xlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0FnZW50Q29yZUdhdGV3YXknIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBhZ2VudENvcmVHYXRld2F5VGFyZ2V0KHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCB0YXJnZXROYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiB0YXJnZXROYW1lIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkJlZHJvY2tBZ2VudENvcmU6OkdhdGV3YXlUYXJnZXQnIH1cbiAgICB9KTtcbiAgfSxcbiAgYWdlbnRDb3JlQnJvd3NlcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpCZWRyb2NrQWdlbnRDb3JlOjpCcm93c2VyQ3VzdG9tJyB9XG4gICAgfSk7XG4gIH0sXG4gIGFnZW50Q29yZUJyb3dzZXJSb2xlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0FnZW50Q29yZUJyb3dzZXInIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBhZ2VudENvcmVDb2RlSW50ZXJwcmV0ZXIoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QmVkcm9ja0FnZW50Q29yZTo6Q29kZUludGVycHJldGVyQ3VzdG9tJyB9XG4gICAgfSk7XG4gIH0sXG4gIGFnZW50Q29yZUNvZGVJbnRlcnByZXRlclJvbGUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQWdlbnRDb3JlQ29kZUludGVycHJldGVyJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hDb21wdXRlRW52aXJvbm1lbnQoc3BvdDogYm9vbGVhbiwgZ3B1OiBib29sZWFuKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogYEJhdGNoLSR7c3BvdCA/ICdzcG90JyA6ICdvbkRlbWFuZCd9LSR7Z3B1ID8gJ2dwdScgOiAnJ31gXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpCYXRjaDo6Q29tcHV0ZUVudmlyb25tZW50JyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhdGNoSm9iUXVldWUoc3BvdDogYm9vbGVhbiwgZ3B1OiBib29sZWFuKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogYEJhdGNoLSR7c3BvdCA/ICdzcG90JyA6ICdvbkRlbWFuZCd9LSR7Z3B1ID8gJ2dwdScgOiAnJ31gXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpCYXRjaDo6Sm9iUXVldWUnIH1cbiAgICB9KTtcbiAgfSxcbiAgc3VibmV0KHB1YmxpY1N1Ym5ldDogYm9vbGVhbiwgc3VibmV0SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6IHB1YmxpY1N1Ym5ldCA/ICdQdWJsaWMnIDogJ1ByaXZhdGUnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlN1Ym5ldCcsIGluZGV4OiBzdWJuZXRJbmRleCB9XG4gICAgfSk7XG4gIH0sXG4gIHZwYygpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpWUEMnIH1cbiAgICB9KTtcbiAgfSxcbiAgdnBjR2F0ZXdheUVuZHBvaW50KHR5cGU6ICdzMycgfCAnZHluYW1vLWRiJykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGAke3R5cGV9LUdhdGV3YXlgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6VlBDRW5kcG9pbnQnIH1cbiAgICB9KTtcbiAgfSxcbiAgZGJTdWJuZXRHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6OkRCU3VibmV0R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYXVyb3JhRGJDbHVzdGVyKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJDbHVzdGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGF1cm9yYURiQ2x1c3RlclBhcmFtZXRlckdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJDbHVzdGVyUGFyYW1ldGVyR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYXVyb3JhRGJDbHVzdGVyTG9nR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGxvZ0dyb3VwVHlwZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0NsdXN0ZXInLCBzdWJ0eXBlOiBsb2dHcm91cFR5cGUgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZGJTZWN1cml0eUdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBkYkluc3RhbmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJJbnN0YW5jZScgfVxuICAgIH0pO1xuICB9LFxuICBkYkluc3RhbmNlTG9nR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGxvZ0dyb3VwVHlwZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0luc3RhbmNlJywgc3VidHlwZTogbG9nR3JvdXBUeXBlIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIG9wZW5TZWFyY2hEb21haW5Mb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgbG9nR3JvdXBUeXBlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnSW5zdGFuY2UnLCBzdWJ0eXBlOiBsb2dHcm91cFR5cGUgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZGJPcHRpb25Hcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6Ok9wdGlvbkdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGRiSW5zdGFuY2VQYXJhbWV0ZXJHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6OkRCUGFyYW1ldGVyR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZGJSZXBsaWNhKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCByZXBsaWNhTnVtOiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnUmVwbGljYScsIHR5cGVJbmRleDogcmVwbGljYU51bSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6OkRCSW5zdGFuY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgZGJSZXBsaWNhTG9nR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGxvZ0dyb3VwVHlwZTogc3RyaW5nLCByZXBsaWNhTnVtOiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnUmVwbGljYScsIHR5cGVJbmRleDogcmVwbGljYU51bSwgc3VidHlwZTogbG9nR3JvdXBUeXBlIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGRiUmVwbGljYVBhcmFtZXRlckdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCByZXBsaWNhTnVtOiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnUmVwbGljYScsIHR5cGVJbmRleDogcmVwbGljYU51bSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6OkRCUGFyYW1ldGVyR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYXVyb3JhRGJJbnN0YW5jZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgaW5zdGFuY2VOdW06IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6OkRCSW5zdGFuY2UnLCBpbmRleDogaW5zdGFuY2VOdW0gfVxuICAgIH0pO1xuICB9LFxuICBhdXJvcmFEYkluc3RhbmNlUGFyYW1ldGVyR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnSW5zdGFuY2UnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJQYXJhbWV0ZXJHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBldmVudEJ1c1J1bGUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RXZlbnRzOjpSdWxlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVRhZ2dpbmdTY2hlZHVsZVJ1bGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1N0cEN1c3RvbVRhZ2dpbmdTY2hlZHVsZScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RXZlbnRzOjpSdWxlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVRhZ2dpbmdTY2hlZHVsZVJ1bGVQZXJtaXNzaW9uKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdTdHBDdXN0b21UYWdnaW5nU2NoZWR1bGVSdWxlJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlBlcm1pc3Npb24nIH1cbiAgICB9KTtcbiAgfSxcbiAgY2xvdWRXYXRjaExvZ0V2ZW50U3Vic2NyaXB0aW9uRmlsdGVyKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBldmVudEluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnRXZlbnQnLFxuICAgICAgICB0eXBlSW5kZXg6IGV2ZW50SW5kZXhcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OlN1YnNjcmlwdGlvbkZpbHRlcicgfVxuICAgIH0pO1xuICB9LFxuICBldmVudFNvdXJjZU1hcHBpbmcoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpFdmVudFNvdXJjZU1hcHBpbmcnIH1cbiAgICB9KTtcbiAgfSxcbiAgaW90RXZlbnRUb3BpY1J1bGUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SW9UOjpUb3BpY1J1bGUnIH1cbiAgICB9KTtcbiAgfSxcbiAga2luZXNpc0V2ZW50Q29uc3VtZXIoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGV2ZW50SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFdmVudCcsXG4gICAgICAgIHR5cGVJbmRleDogZXZlbnRJbmRleFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6S2luZXNpczo6U3RyZWFtQ29uc3VtZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgbGFtYmRhKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBpc1N0cFNlcnZpY2VGdW5jdGlvbj86IGJvb2xlYW4pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogaXNTdHBTZXJ2aWNlRnVuY3Rpb24gPyB7IHR5cGU6ICdDdXN0b21SZXNvdXJjZScgfSA6IHVuZGVmaW5lZCxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFTdHBBbGlhcyhzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdTdHAnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkFsaWFzJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxhbWJkYVVybChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcgfVxuICAgIH0pO1xuICB9LFxuICBjb2RlRGVwbG95RGVwbG95bWVudEdyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkRlcGxveW1lbnRHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBjdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgc2NyaXB0Q3VzdG9tUmVzb3VyY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU2NyaXB0JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hTdGF0ZU1hY2hpbmUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnSm9iRXhlY3V0aW9uJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTdGVwRnVuY3Rpb25zOjpTdGF0ZU1hY2hpbmUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmF0Y2hKb2JEZWZpbml0aW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkJhdGNoOjpKb2JEZWZpbml0aW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhdGNoSm9iTG9nR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZ2xvYmFsU3RhdGVNYWNoaW5lc1JvbGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogJ0dsb2JhbFN0YXRlTWFjaGluZSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBzdGF0ZU1hY2hpbmUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJyB9XG4gICAgfSk7XG4gIH0sXG4gIGludGVybmV0R2F0ZXdheSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpJbnRlcm5ldEdhdGV3YXknIH1cbiAgICB9KTtcbiAgfSxcbiAgdnBjR2F0ZXdheUF0dGFjaG1lbnQoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6VlBDR2F0ZXdheUF0dGFjaG1lbnQnIH1cbiAgICB9KTtcbiAgfSxcbiAgcm91dGVUYWJsZShwdWJsaWNTdWJuZXQ6IGJvb2xlYW4sIHN1Ym5ldEluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBwdWJsaWNTdWJuZXQgPyAnUHVibGljU3VibmV0JyA6ICdQcml2YXRlU3VibmV0JywgdHlwZUluZGV4OiBzdWJuZXRJbmRleCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlJvdXRlVGFibGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgaW50ZXJuZXRHYXRld2F5Um91dGUoc3VibmV0SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdJbnRlcm5ldEdhdGV3YXknIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6Um91dGUnLCBpbmRleDogc3VibmV0SW5kZXggfVxuICAgIH0pO1xuICB9LFxuICBhdGxhc01vbmdvVnBjUm91dGUocHVibGljU3VibmV0VGFibGU6IGJvb2xlYW4sIHN1Ym5ldEluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgQXRsYXNNb25nbyR7cHVibGljU3VibmV0VGFibGUgPyAnUHVibGljU3VibmV0JyA6ICdQcml2YXRlU3VibmV0J31gIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6Um91dGUnLCBpbmRleDogc3VibmV0SW5kZXggfVxuICAgIH0pO1xuICB9LFxuICByb3V0ZVRhYmxlVG9TdWJuZXRBc3NvY2lhdGlvbihwdWJsaWNTdWJuZXQ6IGJvb2xlYW4sIHN1Ym5ldEluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBwdWJsaWNTdWJuZXQgPyAnUHVibGljU3VibmV0JyA6ICdQcml2YXRlU3VibmV0JywgdHlwZUluZGV4OiBzdWJuZXRJbmRleCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlN1Ym5ldFJvdXRlVGFibGVBc3NvY2lhdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBuYXRHYXRld2F5KGF6SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6Ok5hdEdhdGV3YXknLCBpbmRleDogYXpJbmRleCB9XG4gICAgfSk7XG4gIH0sXG4gIG5hdEVsYXN0aWNJcChhekluZGV4OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnTmF0JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkVJUCcsIGluZGV4OiBhekluZGV4IH1cbiAgICB9KTtcbiAgfSxcbiAgbmF0Um91dGUoc3VibmV0SW5kZXg6IG51bWJlcikge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdOYXRQcml2YXRlU3VibmV0JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlJvdXRlJywgaW5kZXg6IHN1Ym5ldEluZGV4IH1cbiAgICB9KTtcbiAgfSxcbiAgZXZlbnRCdXMoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RXZlbnRzOjpFdmVudEJ1cycgfVxuICAgIH0pO1xuICB9LFxuICBldmVudEJ1c0FyY2hpdmUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RXZlbnRzOjpBcmNoaXZlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc0NsdXN0ZXIoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDbHVzdGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc1Rhc2tEZWZpbml0aW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzU2VydmljZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgYmx1ZUdyZWVuOiBib29sZWFuKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IGJsdWVHcmVlbiA/IHsgdHlwZTogJ0JsdWVHcmVlbicgfSA6IHVuZGVmaW5lZCxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpTZXJ2aWNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc0V4ZWN1dGlvblJvbGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0Vjc0V4ZWN1dGlvbicgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc0VjMkluc3RhbmNlUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjoge1xuICAgICAgICB0eXBlOiAnRWNzSW5zdGFuY2UnXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRWMyQXV0b3NjYWxpbmdHcm91cFdhcm1Qb29sKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkF1dG9TY2FsaW5nOjpXYXJtUG9vbCcgfVxuICAgIH0pO1xuICB9LFxuICBldmVudEJ1c1JvbGVGb3JTY2hlZHVsZWRJbnN0YW5jZVJlZnJlc2goKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1NjaGVkdWxlZEluc3RhbmNlUmVmcmVzaCcgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9XG4gICAgfSk7XG4gIH0sXG4gIHNjaGVkdWxlclJ1bGVGb3JTY2hlZHVsZWRJbnN0YW5jZVJlZnJlc2goc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFdmVudHM6OlJ1bGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRWMySW5zdGFuY2VMYXVuY2hUZW1wbGF0ZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkxhdW5jaFRlbXBsYXRlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc0VjMkF1dG9zY2FsaW5nR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6OkF1dG9TY2FsaW5nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRWMyRm9yY2VEZWxldGVBdXRvc2NhbGluZ0dyb3VwQ3VzdG9tUmVzb3VyY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnRm9yY2VEZWxldGVBc2cnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBlY3NEaXNhYmxlTWFuYWdlZFRlcm1pbmF0aW9uUHJvdGVjdGlvbkN1c3RvbVJlc291cmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0Rpc2FibGVNYW5hZ2VkVGVybWluYXRpb25Qcm90ZWN0aW9uJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRGVyZWdpc3RlclRhcmdldHNDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdEZXJlZ2lzdGVyVGFyZ2V0cycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgZWNzRWMyQ2FwYWNpdHlQcm92aWRlcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNhcGFjaXR5UHJvdmlkZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRWMyQ2FwYWNpdHlQcm92aWRlckFzc29jaWF0aW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2x1c3RlckNhcGFjaXR5UHJvdmlkZXJBc3NvY2lhdGlvbnMnIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzRWMySW5zdGFuY2VQcm9maWxlKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6ICdFY3NJbnN0YW5jZSdcbiAgICAgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6SW5zdGFuY2VQcm9maWxlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGVjc1Rhc2tSb2xlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfVxuICAgIH0pO1xuICB9LFxuICBlY3NBdXRvU2NhbGluZ1JvbGUoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0Vjc0F1dG9TY2FsZScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9XG4gICAgfSk7XG4gIH0sXG4gIC8vIGVjc1NjaGVkdWxlZE1haW50ZW5hbmNlRXZlbnRCdXNSdWxlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gIC8vICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gIC8vICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gIC8vICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1NjaGVkdWxlZE1haW50ZW5hbmNlJyB9LFxuICAvLyAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFdmVudHM6OlJ1bGUnIH1cbiAgLy8gICB9KS5yZXBsYWNlQWxsKCdfJywgJycpO1xuICAvLyB9LFxuICBlY3NTY2hlZHVsZWRNYWludGVuYW5jZUxhbWJkYVBlcm1pc3Npb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnU2NoZWR1bGVkTWFpbnRlbmFuY2UnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicgfVxuICAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIH0sXG4gIGJhc3Rpb25FYzJMYXVuY2hUZW1wbGF0ZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkxhdW5jaFRlbXBsYXRlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhc3Rpb25FYzJJbnN0YW5jZVByb2ZpbGUoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpJbnN0YW5jZVByb2ZpbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmFzdGlvbkVjMkF1dG9zY2FsaW5nR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6OkF1dG9TY2FsaW5nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmFzdGlvblNlY3VyaXR5R3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhc3Rpb25Dd0FnZW50U3NtQXNzb2NpYXRpb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnQ3dBZ2VudCcgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U1NNOjpBc3NvY2lhdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBiYXN0aW9uU3NtQWdlbnRTc21Bc3NvY2lhdGlvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdTc21BZ2VudCcgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U1NNOjpBc3NvY2lhdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBiYXN0aW9uUm9sZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgYmFzdGlvbkxvZ0dyb3VwKHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBsb2dUeXBlOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBwYXNjYWxDYXNlKGxvZ1R5cGUpIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGJhc3Rpb25DbG91ZHdhdGNoU3NtRG9jdW1lbnQoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0Jhc3Rpb25DbG91ZHdhdGNoQWdlbnQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlNTTTo6RG9jdW1lbnQnIH1cbiAgICB9KTtcbiAgfSxcbiAgc2VydmljZURpc2NvdmVyeUVjc1NlcnZpY2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIHNlcnZpY2VUYXJnZXRDb250YWluZXJQb3J0OiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgUG9ydCR7c2VydmljZVRhcmdldENvbnRhaW5lclBvcnR9RGlzY292ZXJ5YCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTZXJ2aWNlRGlzY292ZXJ5OjpTZXJ2aWNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIHdvcmtsb2FkU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgbG9hZEJhbGFuY2VyU2VjdXJpdHlHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdMYicgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIHRhcmdldEdyb3VwKHtcbiAgICBsb2FkQmFsYW5jZXJOYW1lLFxuICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICB0YXJnZXRDb250YWluZXJQb3J0LFxuICAgIGJsdWVHcmVlblxuICB9OiB7XG4gICAgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmc7XG4gICAgbG9hZEJhbGFuY2VyTmFtZTogc3RyaW5nO1xuICAgIHRhcmdldENvbnRhaW5lclBvcnQ/OiBudW1iZXI7XG4gICAgYmx1ZUdyZWVuPzogYm9vbGVhbjtcbiAgfSkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6IGAke2xvYWRCYWxhbmNlck5hbWV9JHt0YXJnZXRDb250YWluZXJQb3J0ID8gYFRvUG9ydCR7dGFyZ2V0Q29udGFpbmVyUG9ydH1gIDogJyd9JHtibHVlR3JlZW4gPyAnQkcnIDogJyd9YFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6VGFyZ2V0R3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgbGFtYmRhUm9sZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgZGVmYXVsdExhbWJkYUZ1bmN0aW9uUm9sZSgpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnTGFtYmRhJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH1cbiAgICB9KTtcbiAgfSxcbiAgbGFtYmRhUGVybWlzc2lvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0V2ZW50JywgdHlwZUluZGV4OiBldmVudEluZGV4IH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFQdWJsaWNVcmxQZXJtaXNzaW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1B1YmxpY1VybCcgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxhbWJkYUlvdEV2ZW50UGVybWlzc2lvbih3b3JrbG9hZE5hbWU6IHN0cmluZywgZXZlbnRJbmRleDogbnVtYmVyKSB7XG4gICAgcmV0dXJuIHBhc2NhbENhc2UoYCR7d29ya2xvYWROYW1lfS1FdmVudCR7ZXZlbnRJbmRleH0tbGFtYmRhLWlvdEV2ZW50UGVybWlzc2lvbmApO1xuICB9LFxuICBsYW1iZGFUYXJnZXRHcm91cFBlcm1pc3Npb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGxvYWRCYWxhbmNlck5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGAke2xvYWRCYWxhbmNlck5hbWV9VGFyZ2V0R3JvdXBgIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6QXBpJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlMb2dHcm91cChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpTGFtYmRhSW50ZWdyYXRpb24oe1xuICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICBzdHBIdHRwQXBpR2F0ZXdheU5hbWVcbiAgfToge1xuICAgIHN0cFJlc291cmNlTmFtZTogc3RyaW5nO1xuICAgIHN0cEh0dHBBcGlHYXRld2F5TmFtZTogc3RyaW5nO1xuICB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogc3RwSHR0cEFwaUdhdGV3YXlOYW1lIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6SW50ZWdyYXRpb24nIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaUNvbnRhaW5lcldvcmtsb2FkSW50ZWdyYXRpb24oe1xuICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICBzdHBIdHRwQXBpR2F0ZXdheU5hbWUsXG4gICAgdGFyZ2V0Q29udGFpbmVyUG9ydFxuICB9OiB7XG4gICAgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmc7XG4gICAgdGFyZ2V0Q29udGFpbmVyUG9ydDogbnVtYmVyO1xuICAgIHN0cEh0dHBBcGlHYXRld2F5TmFtZTogc3RyaW5nO1xuICB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYCR7c3RwSHR0cEFwaUdhdGV3YXlOYW1lfVRvUG9ydCR7dGFyZ2V0Q29udGFpbmVyUG9ydH1gIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6SW50ZWdyYXRpb24nIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaUF1dGhvcml6ZXIoeyBtZXRob2QsIHBhdGgsIHN0cFJlc291cmNlTmFtZSB9OiB7IG1ldGhvZDogSHR0cE1ldGhvZDsgcGF0aDogc3RyaW5nOyBzdHBSZXNvdXJjZU5hbWU6IHN0cmluZyB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6ICcnLFxuICAgICAgc3BlY2lmaWVyOiB7XG4gICAgICAgIHR5cGU6IGAke3N0cFJlc291cmNlTmFtZX0tJHttZXRob2QgPT09ICcqJyA/ICdBbnknIDogbWV0aG9kfS0ke3BhdGggPT09ICcqJyA/ICdEZWZhdWx0JyA6IHBhdGh9YFxuICAgICAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpBdXRob3JpemVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlSb3V0ZSh7IG1ldGhvZCwgcGF0aCwgc3RwUmVzb3VyY2VOYW1lIH06IHsgbWV0aG9kOiBIdHRwTWV0aG9kOyBwYXRoOiBzdHJpbmc7IHN0cFJlc291cmNlTmFtZTogc3RyaW5nIH0pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZTogJycsXG4gICAgICBzcGVjaWZpZXI6IHtcbiAgICAgICAgdHlwZTogYCR7c3RwUmVzb3VyY2VOYW1lfS0ke21ldGhvZCA9PT0gJyonID8gJ0FueScgOiBtZXRob2R9LSR7cGF0aCA9PT0gJyonID8gJ0RlZmF1bHQnIDogcGF0aH1gXG4gICAgICB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OlJvdXRlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlWcGNMaW5rKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6VnBjTGluaycgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpVnBjTGlua1NlY3VyaXR5R3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnVnBjTGluaycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlMYW1iZGFQZXJtaXNzaW9uKHtcbiAgICBzdHBSZXNvdXJjZU5hbWVPZkxhbWJkYSxcbiAgICBzdHBSZXNvdXJjZU5hbWVPZkh0dHBBcGlHYXRld2F5XG4gIH06IHtcbiAgICBzdHBSZXNvdXJjZU5hbWVPZkxhbWJkYTogc3RyaW5nO1xuICAgIHN0cFJlc291cmNlTmFtZU9mSHR0cEFwaUdhdGV3YXk6IHN0cmluZztcbiAgfSkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lOiBzdHBSZXNvdXJjZU5hbWVPZkxhbWJkYSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBzdHBSZXNvdXJjZU5hbWVPZkh0dHBBcGlHYXRld2F5IH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpU3RhZ2Uoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpTdGFnZScgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpRG9tYWluKGZ1bGx5UXVhbGlmaWVkRG9tYWluTmFtZTogc3RyaW5nKSB7XG4gICAgLy8gd2UgZG8gbm90IGJ1aWxkIGJ1aWxkIHRoZSByZXNvdXJjZSBuYW1lIGNvbnZlbnRpb25hbGx5IHRocm91Z2ggc3RwUmVzb3VyY2VOYW1lXG4gICAgLy8gdGhpcyBpcyBkdWUgdG8gdXBkYXRlIGJlaGF2aW9ycyBvZiBDbG91ZGZvcm1hdGlvblxuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lOiAnJyxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBnZXRTcGVjaWZpZXJGb3JEb21haW5SZXNvdXJjZShmdWxseVF1YWxpZmllZERvbWFpbk5hbWUpIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6RG9tYWluTmFtZScgfVxuICAgIH0pO1xuICB9LFxuICBodHRwQXBpRGVmYXVsdERvbWFpbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkRvbWFpbk5hbWUnIH1cbiAgICB9KTtcbiAgfSxcbiAgaHR0cEFwaURvbWFpbk1hcHBpbmcoZnVsbHlRdWFsaWZpZWREb21haW5OYW1lOiBzdHJpbmcpIHtcbiAgICAvLyB3ZSBkbyBub3QgYnVpbGQgYnVpbGQgdGhlIHJlc291cmNlIG5hbWUgY29udmVudGlvbmFsbHkgdGhyb3VnaCBzdHBSZXNvdXJjZU5hbWVcbiAgICAvLyB0aGlzIGlzIGR1ZSB0byB1cGRhdGUgYmVoYXZpb3JzIG9mIENsb3VkZm9ybWF0aW9uXG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6ICcnLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGdldFNwZWNpZmllckZvckRvbWFpblJlc291cmNlKGZ1bGx5UXVhbGlmaWVkRG9tYWluTmFtZSkgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpBcGlNYXBwaW5nJyB9XG4gICAgfSk7XG4gIH0sXG4gIGh0dHBBcGlEZWZhdWx0RG9tYWluTWFwcGluZyhzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkFwaU1hcHBpbmcnIH1cbiAgICB9KTtcbiAgfSxcbiAgbGlzdGVuZXIoZXhwb3N1cmVQb3J0OiBudW1iZXIsIHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYFBvcnQke2V4cG9zdXJlUG9ydH1gIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6Okxpc3RlbmVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxpc3RlbmVyUnVsZShleHBvc3VyZVBvcnQ6IG51bWJlciwgc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIHJ1bGVQcmlvcml0eTogbnVtYmVyKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogYFBvcnQke2V4cG9zdXJlUG9ydH1Qcmlvcml0eSR7cnVsZVByaW9yaXR5fWAgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TGlzdGVuZXJSdWxlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxpc3RlbmVyQ2VydGlmaWNhdGVMaXN0KGV4cG9zdXJlUG9ydDogbnVtYmVyLCBzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGBQb3J0JHtleHBvc3VyZVBvcnR9YCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMaXN0ZW5lckNlcnRpZmljYXRlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxvYWRCYWxhbmNlcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMb2FkQmFsYW5jZXInIH1cbiAgICB9KTtcbiAgfSxcbiAgZWNzTG9nR3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGNvbnRhaW5lck5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IGNvbnRhaW5lck5hbWUgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnIH1cbiAgICB9KTtcbiAgfSxcbiAgYXV0b1NjYWxpbmdUYXJnZXQoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnIH1cbiAgICB9KTtcbiAgfSxcbiAgZHluYW1vQXV0b1NjYWxpbmdUYXJnZXQoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIG1ldHJpYzogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogbWV0cmljIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxhYmxlVGFyZ2V0JyB9XG4gICAgfSk7XG4gIH0sXG4gIGF1dG9TY2FsaW5nUG9saWN5KHN0cFJlc291cmNlTmFtZTogc3RyaW5nLCBtZXRyaWM6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IG1ldHJpYyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsaW5nUG9saWN5JyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVJlc291cmNlUzNFdmVudHMoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0V2ZW50cycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIC8vIEBkZXByZWNhdGVkXG4gIC8vIHN0YWNrdGFwZVNlcnZpY2VDdXN0b21SZXNvdXJjZUVkZ2VGdW5jdGlvbnMoKSB7XG4gIC8vICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gIC8vICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0VkZ2VGdW5jdGlvbnMnIH0sXG4gIC8vICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAvLyAgIH0pO1xuICAvLyB9LFxuICBjdXN0b21SZXNvdXJjZVNlbnNpdGl2ZURhdGEoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1NlbnNpdGl2ZURhdGEnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBjdXN0b21SZXNvdXJjZUFjY2VwdFZwY1BlZXJpbmdzKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdBY2NlcHRWcGNQZWVyaW5ncycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbkNlcnQoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0RlZmF1bHREb21haW5DZXJ0JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgY3VzdG9tUmVzb3VyY2VFZGdlTGFtYmRhQnVja2V0KCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdFZGdlTGFtYmRhQnVja2V0JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgY3VzdG9tUmVzb3VyY2VFZGdlTGFtYmRhKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0VkZ2VMYW1iZGEnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBjdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGNkbj86IGJvb2xlYW4pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgJHtjZG4gPyAnQ2RuJyA6ICcnfURlZmF1bHREb21haW5gIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScgfVxuICAgIH0pO1xuICB9LFxuICBjdXN0b21SZXNvdXJjZURhdGFiYXNlRGVsZXRpb25Qcm90ZWN0aW9uKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0RlbGV0aW9uUHJvdGVjdGlvbicgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIHVzZXJQb29sKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sJyB9XG4gICAgfSk7XG4gIH0sXG4gIHVzZXJQb29sQ2xpZW50KHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sQ2xpZW50JyB9XG4gICAgfSk7XG4gIH0sXG4gIHVzZXJQb29sRG9tYWluKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sRG9tYWluJyB9XG4gICAgfSk7XG4gIH0sXG4gIGlkZW50aXR5UHJvdmlkZXIoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIHR5cGU6IFN0cFVzZXJBdXRoUG9vbFsnaWRlbnRpdHlQcm92aWRlcnMnXVtudW1iZXJdWyd0eXBlJ10pIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sSWRlbnRpdHlQcm92aWRlcicgfVxuICAgIH0pO1xuICB9LFxuICBjb2duaXRvTGFtYmRhSG9va1Blcm1pc3Npb24oc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcsIGhvb2tOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBob29rTmFtZSB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlBlcm1pc3Npb24nIH1cbiAgICB9KTtcbiAgfSxcbiAgY29nbml0b1VzZXJQb29sRGV0YWlsc0N1c3RvbVJlc291cmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1VzZXJQb29sRGV0YWlscycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIHVzZXJQb29sVWlDdXN0b21pemF0aW9uQXR0YWNobWVudChzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDb2duaXRvOjpVc2VyUG9vbFVJQ3VzdG9taXphdGlvbkF0dGFjaG1lbnQnIH1cbiAgICB9KTtcbiAgfSxcbiAgc2VydmljZURpc2NvdmVyeVByaXZhdGVOYW1lc3BhY2UoKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0Rpc2NvdmVyeScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6U2VydmljZURpc2NvdmVyeTo6U2VydmljZScgfVxuICAgIH0pO1xuICB9LFxuICBsYW1iZGFDb2RlRGVwbG95QXBwKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdMYW1iZGFDb2RlRGVwbG95JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpBcHBsaWNhdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBzaGFyZWRDaHVua0xheWVyKGxheWVyTnVtYmVyOiBudW1iZXIpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiBgU2hhcmVkQ2h1bmtMYXllciR7bGF5ZXJOdW1iZXJ9YCB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkxheWVyVmVyc2lvbicgfVxuICAgIH0pO1xuICB9LFxuICBlY3NDb2RlRGVwbG95QXBwKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdFQ1NDb2RlRGVwbG95JyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpBcHBsaWNhdGlvbicgfVxuICAgIH0pO1xuICB9LFxuICBzdGFja0J1ZGdldChzdGFja05hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6IHBhc2NhbENhc2Uoc3RhY2tOYW1lKS5yZXBsYWNlQWxsKCdfJywgJycpIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkJ1ZGdldHM6OkJ1ZGdldCcgfVxuICAgIH0pO1xuICB9LFxuICB1cHN0YXNoUmVkaXNEYXRhYmFzZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnVXBzdGFzaDo6RGF0YWJhc2VzVjE6OkRhdGFiYXNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIHVwc3Rhc2hDcmVkZW50aWFsc1Byb3ZpZGVyKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdVcHN0YXNoQ3JlZGVudGlhbHNQcm92aWRlcicgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGNsb3Vkd2F0Y2hBbGFybShzdGFja3RhcGVBbGFybU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lOiBzdGFja3RhcGVBbGFybU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkV2F0Y2g6OkFsYXJtJyB9XG4gICAgfSkucmVwbGFjZUFsbCgnXycsICcnKTtcbiAgfSxcbiAgY2xvdWR3YXRjaEFsYXJtRXZlbnRCdXNOb3RpZmljYXRpb25SdWxlKHN0YWNrdGFwZUFsYXJtTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6IHN0YWNrdGFwZUFsYXJtTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnTm90aWZpY2F0aW9uJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpFdmVudHM6OlJ1bGUnIH1cbiAgICB9KS5yZXBsYWNlQWxsKCdfJywgJycpO1xuICB9LFxuICBjbG91ZHdhdGNoQWxhcm1FdmVudEJ1c05vdGlmaWNhdGlvblJ1bGVMYW1iZGFQZXJtaXNzaW9uKHN0YWNrdGFwZUFsYXJtTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6IHN0YWNrdGFwZUFsYXJtTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnTm90aWZpY2F0aW9uJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlBlcm1pc3Npb24nIH1cbiAgICB9KS5yZXBsYWNlQWxsKCdfJywgJycpO1xuICB9LFxuICBjbG91ZHdhdGNoQWxhcm1TaGFyZWRFdmVudEJ1c05vdGlmaWNhdGlvblJ1bGVMYW1iZGFQZXJtaXNzaW9uKCkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdDbG91ZHdhdGNoQWxhcm1Ob3RpZmljYXRpb25TaGFyZWQnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicgfVxuICAgIH0pLnJlcGxhY2VBbGwoJ18nLCAnJyk7XG4gIH0sXG4gIHNxc1F1ZXVlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlNRUzo6UXVldWUnIH1cbiAgICB9KS5yZXBsYWNlQWxsKCdfJywgJycpO1xuICB9LFxuICBzcXNRdWV1ZVBvbGljeShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpTUVM6OlF1ZXVlUG9saWN5JyB9XG4gICAgfSk7XG4gIH0sXG4gIHNuc1RvcGljKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlNOUzo6VG9waWMnIH1cbiAgICB9KS5yZXBsYWNlQWxsKCdfJywgJycpO1xuICB9LFxuICBraW5lc2lzU3RyZWFtKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OktpbmVzaXM6OlN0cmVhbScgfVxuICAgIH0pO1xuICB9LFxuICB3ZWJBcHBGaXJld2FsbEN1c3RvbVJlc291cmNlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ1dlYkFwcEZpcmV3YWxsJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgd2ViQXBwRmlyZXdhbGxBc3NvY2lhdGlvbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpXQUZ2Mjo6V2ViQUNMQXNzb2NpYXRpb24nIH1cbiAgICB9KTtcbiAgfSxcbiAgb3BlblNlYXJjaERvbWFpbihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpPcGVuU2VhcmNoU2VydmljZTo6RG9tYWluJyB9XG4gICAgfSk7XG4gIH0sXG4gIG9wZW5TZWFyY2hDdXN0b21SZXNvdXJjZShzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdPcGVuU2VhcmNoJyB9LFxuICAgICAgc3VmZml4OiB7IGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgICB9KTtcbiAgfSxcbiAgb3BlblNlYXJjaFNlY3VyaXR5R3JvdXAoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxvZ0ZvcndhcmRpbmdGaXJlaG9zZVRvUzNSb2xlKHN0cFJlc291cmNlTmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0xvZ0ZvcndhcmRpbmdTMycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxvZ0ZvcndhcmRpbmdDd1RvRmlyZWhvc2VSb2xlKHsgbG9nR3JvdXBDZkxvZ2ljYWxOYW1lIH06IHsgbG9nR3JvdXBDZkxvZ2ljYWxOYW1lOiBzdHJpbmcgfSkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lOiBsb2dHcm91cENmTG9naWNhbE5hbWUsXG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0N3VG9GaXJlaG9zZScgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9XG4gICAgfSk7XG4gIH0sXG4gIGxvZ0ZvcndhcmRpbmdGYWlsZWRFdmVudHNCdWNrZXQoc3RwUmVzb3VyY2VOYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYnVpbGRDZkxvZ2ljYWxOYW1lKHtcbiAgICAgIHN0cFJlc291cmNlTmFtZSxcbiAgICAgIHNwZWNpZmllcjogeyB0eXBlOiAnTG9nRm9yd2FyZGluZ0ZhaWxlZFJlY29yZHMnIH0sXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnIH1cbiAgICB9KTtcbiAgfSxcbiAgbG9nRm9yd2FyZGluZ0ZpcmVob3NlRGVsaXZlcnlTdHJlYW0oeyBsb2dHcm91cENmTG9naWNhbE5hbWUgfTogeyBsb2dHcm91cENmTG9naWNhbE5hbWU6IHN0cmluZyB9KSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzdHBSZXNvdXJjZU5hbWU6IGxvZ0dyb3VwQ2ZMb2dpY2FsTmFtZSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6S2luZXNpc0ZpcmVob3NlOjpEZWxpdmVyeVN0cmVhbScgfVxuICAgIH0pO1xuICB9LFxuICBsb2dGb3J3YXJkaW5nU3Vic2NyaXB0aW9uRmlsdGVyKHsgbG9nR3JvdXBDZkxvZ2ljYWxOYW1lIH06IHsgbG9nR3JvdXBDZkxvZ2ljYWxOYW1lOiBzdHJpbmcgfSkge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lOiBsb2dHcm91cENmTG9naWNhbE5hbWUsXG4gICAgICBzdWZmaXg6IHsgY2xvdWRmb3JtYXRpb25SZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OlN1YnNjcmlwdGlvbkZpbHRlcicgfVxuICAgIH0pO1xuICB9LFxuICBpc3N1ZURldGVjdGlvblN1YnNjcmlwdGlvbkZpbHRlcihzdHBSZXNvdXJjZU5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBidWlsZENmTG9naWNhbE5hbWUoe1xuICAgICAgc3RwUmVzb3VyY2VOYW1lLFxuICAgICAgc3BlY2lmaWVyOiB7IHR5cGU6ICdJc3N1ZURldGVjdGlvbicgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6U3Vic2NyaXB0aW9uRmlsdGVyJyB9XG4gICAgfSk7XG4gIH0sXG4gIGlzc3VlRGV0ZWN0aW9uTG9nc1Blcm1pc3Npb24oKSB7XG4gICAgcmV0dXJuIGJ1aWxkQ2ZMb2dpY2FsTmFtZSh7XG4gICAgICBzcGVjaWZpZXI6IHsgdHlwZTogJ0lzc3VlRGV0ZWN0aW9uTG9ncycgfSxcbiAgICAgIHN1ZmZpeDogeyBjbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpQZXJtaXNzaW9uJyB9XG4gICAgfSk7XG4gIH1cbn07XG5cbmNvbnN0IGJ1aWxkQ2ZMb2dpY2FsTmFtZSA9ICh7XG4gIHN0cFJlc291cmNlTmFtZSxcbiAgc3BlY2lmaWVyLFxuICBzdWZmaXhcbn06IHtcbiAgc3RwUmVzb3VyY2VOYW1lPzogc3RyaW5nO1xuICBzcGVjaWZpZXI/OiB7IHR5cGU6IHN0cmluZzsgdHlwZUluZGV4PzogbnVtYmVyOyBzdWJ0eXBlPzogc3RyaW5nIH07XG4gIHN1ZmZpeDoge1xuICAgIGNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlOiBDbG91ZGZvcm1hdGlvblJlc291cmNlVHlwZSB8IFN1cHBvcnRlZFByaXZhdGVDZlJlc291cmNlVHlwZTtcbiAgICBpbmRleD86IG51bWJlcjtcbiAgfTtcbn0pID0+IHtcbiAgY29uc3Qgc3BsaXR0ZWRUeXBlID0gc3VmZml4LmNsb3VkZm9ybWF0aW9uUmVzb3VyY2VUeXBlLnNwbGl0KCc6Jyk7XG4gIGNvbnN0IHJlc29sdmVkUGFyZW50TmFtZSA9IHN0cFJlc291cmNlTmFtZSB8fCAnU3RwJztcbiAgY29uc3QgcmVzb2x2ZWRTcGVjaWZpZXIgPSBzcGVjaWZpZXJcbiAgICA/IGAke3NwZWNpZmllci50eXBlfSR7c3BlY2lmaWVyLnR5cGVJbmRleCAhPT0gdW5kZWZpbmVkID8gc3BlY2lmaWVyLnR5cGVJbmRleCA6ICcnfSR7XG4gICAgICAgIHNwZWNpZmllci5zdWJ0eXBlICE9PSB1bmRlZmluZWQgPyBgLSR7c3BlY2lmaWVyLnN1YnR5cGV9YCA6ICcnXG4gICAgICB9YFxuICAgIDogJyc7XG4gIGNvbnN0IHJlc29sdmVkU3VmZml4ID0gYCR7c3BsaXR0ZWRUeXBlW3NwbGl0dGVkVHlwZS5sZW5ndGggLSAxXX0ke3N1ZmZpeC5pbmRleCAhPT0gdW5kZWZpbmVkID8gc3VmZml4LmluZGV4IDogJyd9YDtcbiAgcmV0dXJuIHBhc2NhbENhc2UoYCR7cmVzb2x2ZWRQYXJlbnROYW1lfS0ke3Jlc29sdmVkU3BlY2lmaWVyfS0ke3Jlc29sdmVkU3VmZml4fWApO1xufTtcblxuY29uc3QgZ2V0U3BlY2lmaWVyRm9yRG9tYWluUmVzb3VyY2UgPSAoZnVsbHlRdWFsaWZpZWREb21haW5OYW1lKSA9PiB7XG4gIGlmIChwYXNjYWxDYXNlKGZ1bGx5UXVhbGlmaWVkRG9tYWluTmFtZSkucmVwbGFjZSgnXycsICcnKS5sZW5ndGggPCA4NSkge1xuICAgIHJldHVybiBwYXNjYWxDYXNlKGZ1bGx5UXVhbGlmaWVkRG9tYWluTmFtZSkucmVwbGFjZSgnXycsICcnKTtcbiAgfVxuICBjb25zdCBzcGxpdHRlZERvbWFpbiA9IGZ1bGx5UXVhbGlmaWVkRG9tYWluTmFtZVxuICAgIC5zcGxpdCgnLicpXG4gICAgLm1hcCgoc3ViZG9tYWluKSA9PiBzdWJkb21haW4uc3BsaXQoJy0nKSlcbiAgICAuZmxhdCgpO1xuICBjb25zdCBtYXhDaGFyYWN0ZXJzUGVyV29yZCA9IE1hdGguZmxvb3IoODUgLyBzcGxpdHRlZERvbWFpbi5sZW5ndGgpO1xuICByZXR1cm4gc3BsaXR0ZWREb21haW4ubWFwKCh3b3JkKSA9PiBwYXNjYWxDYXNlKHdvcmQuc2xpY2UoMCwgbWF4Q2hhcmFjdGVyc1BlcldvcmQpKS5yZXBsYWNlKCdfJywgJycpKS5qb2luKCcnKTtcbn07XG4iLAogICAgImltcG9ydCB7IGNmTG9naWNhbE5hbWVzIH0gZnJvbSAnLi4vLi4vLi4vLi4vc2hhcmVkL25hbWluZy9sb2dpY2FsLW5hbWVzJztcblxuZXhwb3J0IGNvbnN0IENISUxEX1JFU09VUkNFUzogUmVjb3JkPFxuICBTdHBSZXNvdXJjZVR5cGUsXG4gIEFycmF5PHsgbG9naWNhbE5hbWU6ICguLi5hcmdzOiBhbnlbXSkgPT4gc3RyaW5nOyByZXNvdXJjZVR5cGU6IHN0cmluZzsgY29uZGl0aW9uYWw/OiB0cnVlOyB1bnJlc29sdmFibGU/OiB0cnVlIH0+XG4+ID0ge1xuICAvLyA9PT09PSBCVUNLRVQgPT09PT1cbiAgYnVja2V0OiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYnVja2V0LCByZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYnVja2V0UG9saWN5LCByZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXRQb2xpY3knLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdENhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21PcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRPcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERpc3RyaWJ1dGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RGlzdHJpYnV0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRuc1JlY29yZCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSb3V0ZTUzOjpSZWNvcmRTZXQnLCBjb25kaXRpb25hbDogdHJ1ZSB9XG4gIF0sXG5cbiAgLy8gPT09PT0gRlVOQ1RJT04gPT09PT1cbiAgZnVuY3Rpb246IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGEsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lZnNBY2Nlc3NQb2ludCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFRlM6OkFjY2Vzc1BvaW50JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy53b3JrbG9hZFNlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFVcmwsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpVcmwnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFQdWJsaWNVcmxQZXJtaXNzaW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlBlcm1pc3Npb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYUxvZ0dyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhSW52b2tlQ29uZmlnLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkV2ZW50SW52b2tlQ29uZmlnJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhQ29kZURlcGxveUFwcCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6QXBwbGljYXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFWZXJzaW9uUHVibGlzaGVyQ3VzdG9tUmVzb3VyY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNvZGVEZXBsb3lEZXBsb3ltZW50R3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkRlcGxveW1lbnRHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhU3RwQWxpYXMsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpBbGlhcycsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVBlcm1pc3Npb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6UGVybWlzc2lvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH1cbiAgXSxcblxuICAvLyA9PT09PSBSRUxBVElPTkFMIERBVEFCQVNFID09PT09XG4gICdyZWxhdGlvbmFsLWRhdGFiYXNlJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRiU3VibmV0R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQlN1Ym5ldEdyb3VwJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRiU2VjdXJpdHlHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGF0YWJhc2VEZWxldGlvblByb3RlY3Rpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXVyb3JhRGJDbHVzdGVyLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJDbHVzdGVyJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXVyb3JhRGJDbHVzdGVyUGFyYW1ldGVyR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJDbHVzdGVyUGFyYW1ldGVyR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXJvcmFEYkNsdXN0ZXJMb2dHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXJvcmFEYkluc3RhbmNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6OkRCSW5zdGFuY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXJvcmFEYkluc3RhbmNlUGFyYW1ldGVyR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJQYXJhbWV0ZXJHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZGJJbnN0YW5jZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSRFM6OkRCSW5zdGFuY2UnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kYkluc3RhbmNlTG9nR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kYk9wdGlvbkdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6T3B0aW9uR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kYkluc3RhbmNlUGFyYW1ldGVyR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OlJEUzo6REJQYXJhbWV0ZXJHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRiUmVwbGljYSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6UkRTOjpEQkluc3RhbmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZGJSZXBsaWNhTG9nR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IERZTkFNTyBEQiBUQUJMRSA9PT09PVxuICAnZHluYW1vLWRiLXRhYmxlJzogW3sgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmR5bmFtb0dsb2JhbFRhYmxlLCByZXNvdXJjZVR5cGU6ICdBV1M6OkR5bmFtb0RCOjpHbG9iYWxUYWJsZScgfV0sXG5cbiAgLy8gPT09PT0gSFRUUCBBUEkgR0FURVdBWSA9PT09PVxuICAnaHR0cC1hcGktZ2F0ZXdheSc6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpLCByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6QXBpJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlTdGFnZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OlN0YWdlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlWcGNMaW5rU2VjdXJpdHlHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpVnBjTGluaywgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OlZwY0xpbmsnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlEb21haW4sIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpEb21haW5OYW1lJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaURvbWFpbk1hcHBpbmcsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6QXBpTWFwcGluZycsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkRvbWFpbk5hbWUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpRGVmYXVsdERvbWFpbk1hcHBpbmcsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6QXBpTWFwcGluZycsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH1cbiAgXSxcblxuICAvLyA9PT09PSBCQVRDSCBKT0IgPT09PT1cbiAgJ2JhdGNoLWpvYic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaFNlcnZpY2VSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hTcG90RmxlZXRSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hJbnN0YW5jZVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaEluc3RhbmNlUHJvZmlsZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hTdGF0ZU1hY2hpbmVFeGVjdXRpb25Sb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhdGNoSW5zdGFuY2VMYXVuY2hUZW1wbGF0ZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpMYXVuY2hUZW1wbGF0ZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhdGNoSW5zdGFuY2VEZWZhdWx0U2VjdXJpdHlHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hDb21wdXRlRW52aXJvbm1lbnQsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkJhdGNoOjpDb21wdXRlRW52aXJvbm1lbnQnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhdGNoSm9iUXVldWUsIHJlc291cmNlVHlwZTogJ0FXUzo6QmF0Y2g6OkpvYlF1ZXVlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXRjaEpvYkRlZmluaXRpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6QmF0Y2g6OkpvYkRlZmluaXRpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmF0Y2hTdGF0ZU1hY2hpbmUsIHJlc291cmNlVHlwZTogJ0FXUzo6U3RlcEZ1bmN0aW9uczo6U3RhdGVNYWNoaW5lJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhdGNoSm9iTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhdGNoSm9iRXhlY3V0aW9uUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29Vc2VyQXNzb2NpYXRlZFdpdGhSb2xlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6RGF0YWJhc2VVc2VyJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IEVWRU5UIEJVUyA9PT09PVxuICAnZXZlbnQtYnVzJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmV2ZW50QnVzLCByZXNvdXJjZVR5cGU6ICdBV1M6OkV2ZW50czo6RXZlbnRCdXMnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZXZlbnRCdXNBcmNoaXZlLCByZXNvdXJjZVR5cGU6ICdBV1M6OkV2ZW50czo6QXJjaGl2ZScsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBTVEFURSBNQUNISU5FID09PT09XG4gICdzdGF0ZS1tYWNoaW5lJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmdsb2JhbFN0YXRlTWFjaGluZXNSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3RhdGVNYWNoaW5lLCByZXNvdXJjZVR5cGU6ICdBV1M6OlN0ZXBGdW5jdGlvbnM6OlN0YXRlTWFjaGluZScgfVxuICBdLFxuXG4gIC8vID09PT09IFJFRElTIENMVVNURVIgPT09PT1cbiAgJ3JlZGlzLWNsdXN0ZXInOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMucmVkaXNQYXJhbWV0ZXJHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGlDYWNoZTo6UGFyYW1ldGVyR3JvdXAnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMucmVkaXNTdWJuZXRHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGlDYWNoZTo6U3VibmV0R3JvdXAnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMucmVkaXNTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5yZWRpc0xvZ0dyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5yZWRpc1JlcGxpY2F0aW9uR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpQ2FjaGU6OlJlcGxpY2F0aW9uR3JvdXAnIH1cbiAgXSxcblxuICAvLyA9PT09PSBNT05HTyBEQiBBVExBUyBDTFVTVEVSID09PT09XG4gICdtb25nby1kYi1hdGxhcy1jbHVzdGVyJzogW1xuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdGxhc01vbmdvQ3JlZGVudGlhbHNQcm92aWRlcixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdGxhc01vbmdvUHJvamVjdCwgcmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6UHJvamVjdCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29Qcm9qZWN0SXBBY2Nlc3NMaXN0LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6UHJvamVjdElwQWNjZXNzTGlzdCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29Qcm9qZWN0VnBjTmV0d29ya0NvbnRhaW5lcixcbiAgICAgIHJlc291cmNlVHlwZTogJ01vbmdvREI6OlN0cEF0bGFzVjE6Ok5ldHdvcmtDb250YWluZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdGxhc01vbmdvUHJvamVjdFZwY05ldHdvcmtQZWVyaW5nLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6TmV0d29ya1BlZXJpbmcnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29WcGNSb3V0ZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlJvdXRlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdGxhc01vbmdvQ2x1c3RlciwgcmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6Q2x1c3RlcicgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb0NsdXN0ZXJNYXN0ZXJVc2VyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6RGF0YWJhc2VVc2VyJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IFVTRVIgQVVUSCBQT09MID09PT09XG4gICd1c2VyLWF1dGgtcG9vbCc6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy51c2VyUG9vbCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2duaXRvOjpVc2VyUG9vbCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zbnNSb2xlU2VuZFNtc0Zyb21Db2duaXRvLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy51c2VyUG9vbENsaWVudCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2duaXRvOjpVc2VyUG9vbENsaWVudCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy51c2VyUG9vbERvbWFpbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2duaXRvOjpVc2VyUG9vbERvbWFpbicgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY29nbml0b1VzZXJQb29sRGV0YWlsc0N1c3RvbVJlc291cmNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaWRlbnRpdHlQcm92aWRlcixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q29nbml0bzo6VXNlclBvb2xJZGVudGl0eVByb3ZpZGVyJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY29nbml0b0xhbWJkYUhvb2tQZXJtaXNzaW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlBlcm1pc3Npb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy51c2VyUG9vbFVpQ3VzdG9taXphdGlvbkF0dGFjaG1lbnQsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZ25pdG86OlVzZXJQb29sVUlDdXN0b21pemF0aW9uQXR0YWNobWVudCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLndlYkFwcEZpcmV3YWxsQXNzb2NpYXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OldBRnYyOjpXZWJBQ0xBc3NvY2lhdGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH1cbiAgXSxcblxuICAvLyA9PT09PSBVUFNUQVNIIFJFRElTID09PT09XG4gICd1cHN0YXNoLXJlZGlzJzogW1xuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy51cHN0YXNoQ3JlZGVudGlhbHNQcm92aWRlcixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy51cHN0YXNoUmVkaXNEYXRhYmFzZSwgcmVzb3VyY2VUeXBlOiAnVXBzdGFzaDo6UmVkaXM6OkRhdGFiYXNlJyB9XG4gIF0sXG5cbiAgLy8gPT09PT0gQVBQTElDQVRJT04gTE9BRCBCQUxBTkNFUiA9PT09PVxuICAnYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlcic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sb2FkQmFsYW5jZXIsIHJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TG9hZEJhbGFuY2VyJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxvYWRCYWxhbmNlclNlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy53ZWJBcHBGaXJld2FsbEFzc29jaWF0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpXQUZ2Mjo6V2ViQUNMQXNzb2NpYXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxpc3RlbmVyLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6Okxpc3RlbmVyJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRuc1JlY29yZCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSb3V0ZTUzOjpSZWNvcmRTZXQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdENhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21PcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRPcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERpc3RyaWJ1dGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RGlzdHJpYnV0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IE5FVFdPUksgTE9BRCBCQUxBTkNFUiA9PT09PVxuICAnbmV0d29yay1sb2FkLWJhbGFuY2VyJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxvYWRCYWxhbmNlciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMb2FkQmFsYW5jZXInIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubG9hZEJhbGFuY2VyU2VjdXJpdHlHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGlzdGVuZXIsIHJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TGlzdGVuZXInLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBIT1NUSU5HIEJVQ0tFVCA9PT09PVxuICAvLyBIb3N0aW5nIGJ1Y2tldCBkZWxlZ2F0ZXMgdG8gYSBidWNrZXQgcmVzb3VyY2UsIHNvIGl0IGluY2x1ZGVzIGFsbCBidWNrZXQgY2hpbGQgcmVzb3VyY2VzXG4gICdob3N0aW5nLWJ1Y2tldCc6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXQsIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXRQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBXRUIgQVBQIEZJUkVXQUxMID09PT09XG4gICd3ZWItYXBwLWZpcmV3YWxsJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLndlYkFwcEZpcmV3YWxsQ3VzdG9tUmVzb3VyY2UsIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyB9XG4gIF0sXG5cbiAgLy8gPT09PT0gT1BFTiBTRUFSQ0ggRE9NQUlOID09PT09XG4gICdvcGVuLXNlYXJjaC1kb21haW4nOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMub3BlblNlYXJjaERvbWFpbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpPcGVuU2VhcmNoU2VydmljZTo6RG9tYWluJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLm9wZW5TZWFyY2hTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLm9wZW5TZWFyY2hEb21haW5Mb2dHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5vcGVuU2VhcmNoQ3VzdG9tUmVzb3VyY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH1cbiAgXSxcblxuICAvLyA9PT09PSBFRlMgRklMRVNZU1RFTSA9PT09PVxuICAnZWZzLWZpbGVzeXN0ZW0nOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWZzRmlsZXN5c3RlbSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFRlM6OkZpbGVTeXN0ZW0nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWZzU2VjdXJpdHlHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVmc01vdW50VGFyZ2V0LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFRlM6Ok1vdW50VGFyZ2V0JyxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH1cbiAgXSxcblxuICAvLyA9PT09PSBORVhUSlMgV0VCID09PT09XG4gIC8vIE5leHRKUyB3ZWIgZGVsZWdhdGVzIHRvOiBidWNrZXQsIGltYWdlRnVuY3Rpb24sIHJldmFsaWRhdGlvbkZ1bmN0aW9uLCByZXZhbGlkYXRpb25RdWV1ZSxcbiAgLy8gcmV2YWxpZGF0aW9uVGFibGUsIHJldmFsaWRhdGlvbkluc2VydEZ1bmN0aW9uLCBhbmQgb3B0aW9uYWxseSBzZXJ2ZXJFZGdlRnVuY3Rpb24gb3Igc2VydmVyRnVuY3Rpb25cbiAgJ25leHRqcy13ZWInOiBbXG4gICAgLy8gTmV4dEpTLXNwZWNpZmljIHJlc291cmNlc1xuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5vcGVuTmV4dEhvc3RIZWFkZXJSZXdyaXRlRnVuY3Rpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkZ1bmN0aW9uJ1xuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLm9wZW5OZXh0QXNzZXRSZXBsYWNlckN1c3RvbVJlc291cmNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMub3Blbk5leHREeW5hbW9JbnNlcnRDdXN0b21SZXNvdXJjZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJ1xuICAgIH0sXG4gICAgLy8gRnJvbSBidWNrZXRcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXQsIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXRQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgLy8gRnJvbSBmdW5jdGlvbnMgKGltYWdlRnVuY3Rpb24sIHJldmFsaWRhdGlvbkZ1bmN0aW9uLCBzZXJ2ZXJGdW5jdGlvbiwgd2FybWVyRnVuY3Rpb24sIHJldmFsaWRhdGlvbkluc2VydEZ1bmN0aW9uKVxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYUxvZ0dyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFVcmwsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpVcmwnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIC8vIEZyb20gZWRnZSBmdW5jdGlvbiAoc2VydmVyRWRnZUZ1bmN0aW9uKVxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZUVkZ2VMYW1iZGEsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgLy8gRnJvbSByZXZhbGlkYXRpb25RdWV1ZVxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNxc1F1ZXVlLCByZXNvdXJjZVR5cGU6ICdBV1M6OlNRUzo6UXVldWUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3FzUXVldWVQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZVBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgLy8gRnJvbSByZXZhbGlkYXRpb25UYWJsZVxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmR5bmFtb0dsb2JhbFRhYmxlLCByZXNvdXJjZVR5cGU6ICdBV1M6OkR5bmFtb0RCOjpHbG9iYWxUYWJsZScgfVxuICBdLFxuXG4gIC8vID09PT09IE1VTFRJLUNPTlRBSU5FUiBXT1JLTE9BRCA9PT09PVxuICAnbXVsdGktY29udGFpbmVyLXdvcmtsb2FkJzogW1xuICAgIC8vIFNoYXJlZCBnbG9iYWwgcmVzb3VyY2VzIChjb25kaXRpb25hbCAtIGNyZWF0ZWQgb25seSBvbmNlIGlmIG5vdCBleGlzdHMpXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRXhlY3V0aW9uUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0F1dG9TY2FsaW5nUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIC8vIFNjYWxpbmcgcmVzb3VyY2VzIChjb25kaXRpb25hbCAtIG9ubHkgaWYgc2NhbGluZyBpcyBjb25maWd1cmVkKVxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXRvU2NhbGluZ1RhcmdldCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXRvU2NhbGluZ1BvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGluZ1BvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgLy8gRUMyLWJhc2VkIHJlc291cmNlcyAoY29uZGl0aW9uYWwgLSBvbmx5IGlmIGluc3RhbmNlVHlwZXMgYXJlIGNvbmZpZ3VyZWQpXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMySW5zdGFuY2VSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmV2ZW50QnVzUm9sZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZVByb2ZpbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpJbnN0YW5jZVByb2ZpbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZUxhdW5jaFRlbXBsYXRlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkxhdW5jaFRlbXBsYXRlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQXV0b3NjYWxpbmdHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6OkF1dG9TY2FsaW5nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJGb3JjZURlbGV0ZUF1dG9zY2FsaW5nR3JvdXBDdXN0b21SZXNvdXJjZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQ2FwYWNpdHlQcm92aWRlcixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDYXBhY2l0eVByb3ZpZGVyJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQ2FwYWNpdHlQcm92aWRlckFzc29jaWF0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNsdXN0ZXJDYXBhY2l0eVByb3ZpZGVyQXNzb2NpYXRpb25zJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc2NoZWR1bGVyUnVsZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6U2NoZWR1bGVyOjpTY2hlZHVsZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkF1dG9zY2FsaW5nR3JvdXBXYXJtUG9vbCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6Oldhcm1Qb29sJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICAvLyBEZXBsb3ltZW50IHJlc291cmNlcyAoY29uZGl0aW9uYWwgLSBvbmx5IGlmIGRlcGxveW1lbnQgaXMgY29uZmlndXJlZClcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NDb2RlRGVwbG95QXBwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkFwcGxpY2F0aW9uJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY29kZURlcGxveURlcGxveW1lbnRHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6RGVwbG95bWVudEdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICAvLyBDb3JlIHJlc291cmNlcyAoYWx3YXlzIHByZXNlbnQpXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQ2x1c3RlciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNsdXN0ZXInIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMud29ya2xvYWRTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzU2VydmljZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpTZXJ2aWNlJyxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzVGFza1JvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc1Rhc2tEZWZpbml0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nIH0sXG4gICAgLy8gQ29uZGl0aW9uYWwgcmVzb3VyY2VzXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0xvZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWZzQWNjZXNzUG9pbnQsIHJlc291cmNlVHlwZTogJ0FXUzo6RUZTOjpBY2Nlc3NQb2ludCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF0bGFzTW9uZ29Vc2VyQXNzb2NpYXRlZFdpdGhSb2xlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnTW9uZ29EQjo6U3RwQXRsYXNWMTo6RGF0YWJhc2VVc2VyJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IFNRUyBRVUVVRSA9PT09PVxuICAnc3FzLXF1ZXVlJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNxc1F1ZXVlLCByZXNvdXJjZVR5cGU6ICdBV1M6OlNRUzo6UXVldWUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3FzUXVldWVQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6U1FTOjpRdWV1ZVBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBTTlMgVE9QSUMgPT09PT1cbiAgJ3Nucy10b3BpYyc6IFt7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zbnNUb3BpYywgcmVzb3VyY2VUeXBlOiAnQVdTOjpTTlM6OlRvcGljJyB9XSxcblxuICAvLyA9PT09PSBLSU5FU0lTIFNUUkVBTSA9PT09PVxuICAna2luZXNpcy1zdHJlYW0nOiBbeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMua2luZXNpc1N0cmVhbSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpLaW5lc2lzOjpTdHJlYW0nIH1dLFxuXG4gIC8vID09PT09IEJBU1RJT04gPT09PT1cbiAgYmFzdGlvbjogW1xuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXN0aW9uQ2xvdWR3YXRjaFNzbURvY3VtZW50LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpTU006OkRvY3VtZW50JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXN0aW9uRWMyQXV0b3NjYWxpbmdHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6QXV0b1NjYWxpbmdHcm91cCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5iYXN0aW9uU2VjdXJpdHlHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmFzdGlvbkVjMkxhdW5jaFRlbXBsYXRlLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TGF1bmNoVGVtcGxhdGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmFzdGlvblJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhc3Rpb25FYzJJbnN0YW5jZVByb2ZpbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpJbnN0YW5jZVByb2ZpbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYmFzdGlvbkN3QWdlbnRTc21Bc3NvY2lhdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTU006OkFzc29jaWF0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhc3Rpb25Tc21BZ2VudFNzbUFzc29jaWF0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OlNTTTo6QXNzb2NpYXRpb24nIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJhc3Rpb25Mb2dHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gRURHRSBMQU1CREEgRlVOQ1RJT04gPT09PT1cbiAgJ2VkZ2UtbGFtYmRhLWZ1bmN0aW9uJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRWRnZUxhbWJkYSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnIH1cbiAgXSxcblxuICAvLyA9PT09PSBXRUIgU0VSVklDRSA9PT09PVxuICAvLyBXZWIgc2VydmljZSBkZWxlZ2F0ZXMgdG86IGNvbnRhaW5lcldvcmtsb2FkICsgb3B0aW9uYWxseSAoaHR0cEFwaUdhdGV3YXkgT1IgbG9hZEJhbGFuY2VyIE9SIG5ldHdvcmtMb2FkQmFsYW5jZXIpXG4gICd3ZWItc2VydmljZSc6IFtcbiAgICAvLyBGcm9tIG11bHRpLWNvbnRhaW5lci13b3JrbG9hZCAtIGNvcmUgcmVzb3VyY2VzIChhbHdheXMgcHJlc2VudClcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NDbHVzdGVyLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2x1c3RlcicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy53b3JrbG9hZFNlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NTZXJ2aWNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OlNlcnZpY2UnLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NUYXNrUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzVGFza0RlZmluaXRpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpUYXNrRGVmaW5pdGlvbicgfSxcbiAgICAvLyBGcm9tIG11bHRpLWNvbnRhaW5lci13b3JrbG9hZCAtIGNvbmRpdGlvbmFsIHJlc291cmNlc1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0V4ZWN1dGlvblJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NBdXRvU2NhbGluZ1JvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXV0b1NjYWxpbmdUYXJnZXQsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxhYmxlVGFyZ2V0JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXV0b1NjYWxpbmdQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkFwcGxpY2F0aW9uQXV0b1NjYWxpbmc6OlNjYWxpbmdQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5ldmVudEJ1c1JvbGVGb3JTY2hlZHVsZWRJbnN0YW5jZVJlZnJlc2gsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMySW5zdGFuY2VQcm9maWxlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6SW5zdGFuY2VQcm9maWxlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMySW5zdGFuY2VMYXVuY2hUZW1wbGF0ZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpMYXVuY2hUZW1wbGF0ZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkF1dG9zY2FsaW5nR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkF1dG9TY2FsaW5nOjpBdXRvU2NhbGluZ0dyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyRm9yY2VEZWxldGVBdXRvc2NhbGluZ0dyb3VwQ3VzdG9tUmVzb3VyY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkNhcGFjaXR5UHJvdmlkZXIsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2FwYWNpdHlQcm92aWRlcicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkNhcGFjaXR5UHJvdmlkZXJBc3NvY2lhdGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDbHVzdGVyQ2FwYWNpdHlQcm92aWRlckFzc29jaWF0aW9ucycsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNjaGVkdWxlclJ1bGVGb3JTY2hlZHVsZWRJbnN0YW5jZVJlZnJlc2gsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OlNjaGVkdWxlcjo6U2NoZWR1bGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJBdXRvc2NhbGluZ0dyb3VwV2FybVBvb2wsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkF1dG9TY2FsaW5nOjpXYXJtUG9vbCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQ29kZURlcGxveUFwcCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpBcHBsaWNhdGlvbicsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNvZGVEZXBsb3lEZXBsb3ltZW50R3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkRlcGxveW1lbnRHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0xvZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWZzQWNjZXNzUG9pbnQsIHJlc291cmNlVHlwZTogJ0FXUzo6RUZTOjpBY2Nlc3NQb2ludCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgLy8gRnJvbSBhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyIChjb25kaXRpb25hbCAtIG9ubHkgaWYgQUxCIGlzIHVzZWQpXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxvYWRCYWxhbmNlcixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TG9hZEJhbGFuY2VyJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubG9hZEJhbGFuY2VyU2VjdXJpdHlHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5saXN0ZW5lciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFbGFzdGljTG9hZEJhbGFuY2luZ1YyOjpMaXN0ZW5lcicsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLndlYkFwcEZpcmV3YWxsQXNzb2NpYXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OldBRnYyOjpXZWJBQ0xBc3NvY2lhdGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgLy8gRnJvbSBodHRwLWFwaS1nYXRld2F5IChjb25kaXRpb25hbCAtIG9ubHkgaWYgSFRUUCBBUEkgR2F0ZXdheSBpcyB1c2VkLCBhbHRlcm5hdGl2ZSB0byBBTEIvTkxCKVxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGksIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpBcGknLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlTdGFnZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OlN0YWdlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpVnBjTGlua1NlY3VyaXR5R3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaVZwY0xpbmssIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpWcGNMaW5rJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpRG9tYWluLCByZXNvdXJjZVR5cGU6ICdBV1M6OkFwaUdhdGV3YXlWMjo6RG9tYWluTmFtZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmh0dHBBcGlEb21haW5NYXBwaW5nLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkFwaU1hcHBpbmcnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5odHRwQXBpRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBpR2F0ZXdheVYyOjpEb21haW5OYW1lJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuaHR0cEFwaURlZmF1bHREb21haW5NYXBwaW5nLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcGlHYXRld2F5VjI6OkFwaU1hcHBpbmcnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIC8vIENvbW1vbiByZXNvdXJjZXMgKGRvbWFpbnMsIENETiAtIGFsbCBjb25kaXRpb25hbClcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRuc1JlY29yZCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSb3V0ZTUzOjpSZWNvcmRTZXQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdENhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21PcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRPcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERpc3RyaWJ1dGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RGlzdHJpYnV0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IFBSSVZBVEUgU0VSVklDRSA9PT09PVxuICAvLyBQcml2YXRlIHNlcnZpY2UgZGVsZWdhdGVzIHRvOiBjb250YWluZXJXb3JrbG9hZCArIG9wdGlvbmFsbHkgbG9hZEJhbGFuY2VyXG4gICdwcml2YXRlLXNlcnZpY2UnOiBbXG4gICAgLy8gRnJvbSBtdWx0aS1jb250YWluZXItd29ya2xvYWQgLSBjb3JlIHJlc291cmNlcyAoYWx3YXlzIHByZXNlbnQpXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQ2x1c3RlciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNsdXN0ZXInIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMud29ya2xvYWRTZWN1cml0eUdyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzU2VydmljZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpTZXJ2aWNlJyxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzVGFza1JvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc1Rhc2tEZWZpbml0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6VGFza0RlZmluaXRpb24nIH0sXG4gICAgLy8gRnJvbSBtdWx0aS1jb250YWluZXItd29ya2xvYWQgLSBjb25kaXRpb25hbCByZXNvdXJjZXNcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFeGVjdXRpb25Sb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzQXV0b1NjYWxpbmdSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1dG9TY2FsaW5nVGFyZ2V0LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsYWJsZVRhcmdldCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmF1dG9TY2FsaW5nUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBcHBsaWNhdGlvbkF1dG9TY2FsaW5nOjpTY2FsaW5nUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZXZlbnRCdXNSb2xlRm9yU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlUHJvZmlsZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06Okluc3RhbmNlUHJvZmlsZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkluc3RhbmNlTGF1bmNoVGVtcGxhdGUsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6TGF1bmNoVGVtcGxhdGUnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJBdXRvc2NhbGluZ0dyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6QXV0b1NjYWxpbmdHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkZvcmNlRGVsZXRlQXV0b3NjYWxpbmdHcm91cEN1c3RvbVJlc291cmNlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJDYXBhY2l0eVByb3ZpZGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNhcGFjaXR5UHJvdmlkZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJDYXBhY2l0eVByb3ZpZGVyQXNzb2NpYXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6Q2x1c3RlckNhcGFjaXR5UHJvdmlkZXJBc3NvY2lhdGlvbnMnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zY2hlZHVsZXJSdWxlRm9yU2NoZWR1bGVkSW5zdGFuY2VSZWZyZXNoLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpTY2hlZHVsZXI6OlNjaGVkdWxlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQXV0b3NjYWxpbmdHcm91cFdhcm1Qb29sLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpBdXRvU2NhbGluZzo6V2FybVBvb2wnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0NvZGVEZXBsb3lBcHAsIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6QXBwbGljYXRpb24nLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jb2RlRGVwbG95RGVwbG95bWVudEdyb3VwLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDb2RlRGVwbG95OjpEZXBsb3ltZW50R3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NMb2dHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVmc0FjY2Vzc1BvaW50LCByZXNvdXJjZVR5cGU6ICdBV1M6OkVGUzo6QWNjZXNzUG9pbnQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIC8vIEZyb20gYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlciAoY29uZGl0aW9uYWwgLSBvbmx5IGlmIEFMQiBpcyBjb25maWd1cmVkKVxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sb2FkQmFsYW5jZXIsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVsYXN0aWNMb2FkQmFsYW5jaW5nVjI6OkxvYWRCYWxhbmNlcicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxvYWRCYWxhbmNlclNlY3VyaXR5R3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDMjo6U2VjdXJpdHlHcm91cCcsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGlzdGVuZXIsIHJlc291cmNlVHlwZTogJ0FXUzo6RWxhc3RpY0xvYWRCYWxhbmNpbmdWMjo6TGlzdGVuZXInLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBXT1JLRVIgU0VSVklDRSA9PT09PVxuICAvLyBXb3JrZXIgc2VydmljZSBkZWxlZ2F0ZXMgdG86IGNvbnRhaW5lcldvcmtsb2FkIG9ubHlcbiAgJ3dvcmtlci1zZXJ2aWNlJzogW1xuICAgIC8vIEZyb20gbXVsdGktY29udGFpbmVyLXdvcmtsb2FkIC0gY29yZSByZXNvdXJjZXMgKGFsd2F5cyBwcmVzZW50KVxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0NsdXN0ZXIsIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDbHVzdGVyJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLndvcmtsb2FkU2VjdXJpdHlHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OlNlY3VyaXR5R3JvdXAnIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc1NlcnZpY2UsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkVDUzo6U2VydmljZScsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc1Rhc2tSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NUYXNrRGVmaW5pdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OlRhc2tEZWZpbml0aW9uJyB9LFxuICAgIC8vIEZyb20gbXVsdGktY29udGFpbmVyLXdvcmtsb2FkIC0gY29uZGl0aW9uYWwgcmVzb3VyY2VzXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRXhlY3V0aW9uUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0F1dG9TY2FsaW5nUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXRvU2NhbGluZ1RhcmdldCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGFibGVUYXJnZXQnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hdXRvU2NhbGluZ1BvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXBwbGljYXRpb25BdXRvU2NhbGluZzo6U2NhbGluZ1BvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZSxcbiAgICAgIHVucmVzb2x2YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMySW5zdGFuY2VSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmV2ZW50QnVzUm9sZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZVByb2ZpbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpJbnN0YW5jZVByb2ZpbGUnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJJbnN0YW5jZUxhdW5jaFRlbXBsYXRlLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQzI6OkxhdW5jaFRlbXBsYXRlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQXV0b3NjYWxpbmdHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6OkF1dG9TY2FsaW5nR3JvdXAnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NFYzJGb3JjZURlbGV0ZUF1dG9zY2FsaW5nR3JvdXBDdXN0b21SZXNvdXJjZSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQ2FwYWNpdHlQcm92aWRlcixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6RUNTOjpDYXBhY2l0eVByb3ZpZGVyJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzRWMyQ2FwYWNpdHlQcm92aWRlckFzc29jaWF0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpFQ1M6OkNsdXN0ZXJDYXBhY2l0eVByb3ZpZGVyQXNzb2NpYXRpb25zJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc2NoZWR1bGVyUnVsZUZvclNjaGVkdWxlZEluc3RhbmNlUmVmcmVzaCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6U2NoZWR1bGVyOjpTY2hlZHVsZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmVjc0VjMkF1dG9zY2FsaW5nR3JvdXBXYXJtUG9vbCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QXV0b1NjYWxpbmc6Oldhcm1Qb29sJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lY3NDb2RlRGVwbG95QXBwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNvZGVEZXBsb3k6OkFwcGxpY2F0aW9uJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY29kZURlcGxveURlcGxveW1lbnRHcm91cCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q29kZURlcGxveTo6RGVwbG95bWVudEdyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZWNzTG9nR3JvdXAsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5lZnNBY2Nlc3NQb2ludCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpFRlM6OkFjY2Vzc1BvaW50JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYXRsYXNNb25nb1VzZXJBc3NvY2lhdGVkV2l0aFJvbGUsXG4gICAgICByZXNvdXJjZVR5cGU6ICdNb25nb0RCOjpTdHBBdGxhc1YxOjpEYXRhYmFzZVVzZXInLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9XG4gIF0sXG5cbiAgLy8gPT09PT0gQVNUUk8gV0VCID09PT09XG4gICdhc3Ryby13ZWInOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3NyV2ViSG9zdEhlYWRlclJld3JpdGVGdW5jdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXQsIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXRQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVVybCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBOVVhUIFdFQiA9PT09PVxuICAnbnV4dC13ZWInOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3NyV2ViSG9zdEhlYWRlclJld3JpdGVGdW5jdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXQsIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXRQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVVybCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBTVkVMVEVLSVQgV0VCID09PT09XG4gICdzdmVsdGVraXQtd2ViJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNzcldlYkhvc3RIZWFkZXJSZXdyaXRlRnVuY3Rpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYnVja2V0LCByZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYnVja2V0UG9saWN5LCByZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXRQb2xpY3knLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdENhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21PcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRPcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERpc3RyaWJ1dGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RGlzdHJpYnV0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRuc1JlY29yZCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSb3V0ZTUzOjpSZWNvcmRTZXQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYUxvZ0dyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFVcmwsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpVcmwnLCBjb25kaXRpb25hbDogdHJ1ZSB9XG4gIF0sXG5cbiAgLy8gPT09PT0gU09MSURTVEFSVCBXRUIgPT09PT1cbiAgJ3NvbGlkc3RhcnQtd2ViJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLnNzcldlYkhvc3RIZWFkZXJSZXdyaXRlRnVuY3Rpb24sIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYnVja2V0LCByZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXQnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYnVja2V0UG9saWN5LCByZXNvdXJjZVR5cGU6ICdBV1M6OlMzOjpCdWNrZXRQb2xpY3knLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21DYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdENhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRDdXN0b21PcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRPcmlnaW5SZXF1ZXN0UG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpPcmlnaW5SZXF1ZXN0UG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERpc3RyaWJ1dGlvbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6RGlzdHJpYnV0aW9uJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY3VzdG9tUmVzb3VyY2VEZWZhdWx0RG9tYWluLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZvcm1hdGlvbjo6Q3VzdG9tUmVzb3VyY2UnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmRuc1JlY29yZCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpSb3V0ZTUzOjpSZWNvcmRTZXQnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVJvbGUsIHJlc291cmNlVHlwZTogJ0FXUzo6SUFNOjpSb2xlJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYUxvZ0dyb3VwLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxvZ3M6OkxvZ0dyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFVcmwsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpVcmwnLCBjb25kaXRpb25hbDogdHJ1ZSB9XG4gIF0sXG5cbiAgLy8gPT09PT0gVEFOU1RBQ0sgV0VCID09PT09XG4gICd0YW5zdGFjay13ZWInOiBbXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuc3NyV2ViSG9zdEhlYWRlclJld3JpdGVGdW5jdGlvbiwgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXQsIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldCcgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5idWNrZXRQb2xpY3ksIHJlc291cmNlVHlwZTogJ0FXUzo6UzM6OkJ1Y2tldFBvbGljeScsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbUNhY2hlUG9saWN5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDYWNoZVBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0Q2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udEN1c3RvbU9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGVmYXVsdE9yaWdpblJlcXVlc3RQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6Ok9yaWdpblJlcXVlc3RQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpEaXN0cmlidXRpb24nLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jdXN0b21SZXNvdXJjZURlZmF1bHREb21haW4sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpDdXN0b21SZXNvdXJjZScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuZG5zUmVjb3JkLCByZXNvdXJjZVR5cGU6ICdBV1M6OlJvdXRlNTM6OlJlY29yZFNldCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhTG9nR3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6TG9nczo6TG9nR3JvdXAnLCBjb25kaXRpb25hbDogdHJ1ZSB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmxhbWJkYVVybCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMYW1iZGE6OlVybCcsIGNvbmRpdGlvbmFsOiB0cnVlIH1cbiAgXSxcblxuICAvLyA9PT09PSBSRU1JWCBXRUIgPT09PT1cbiAgJ3JlbWl4LXdlYic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5zc3JXZWJIb3N0SGVhZGVyUmV3cml0ZUZ1bmN0aW9uLCByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkZ1bmN0aW9uJyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0JyB9LFxuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmJ1Y2tldFBvbGljeSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpTMzo6QnVja2V0UG9saWN5JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpDbG91ZEZyb250OjpDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tQ2FjaGVQb2xpY3ksXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkNhY2hlUG9saWN5JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuY2xvdWRmcm9udERlZmF1bHRDYWNoZVBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6Q2FjaGVQb2xpY3knLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHtcbiAgICAgIGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5jbG91ZGZyb250Q3VzdG9tT3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREZWZhdWx0T3JpZ2luUmVxdWVzdFBvbGljeSxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGcm9udDo6T3JpZ2luUmVxdWVzdFBvbGljeScsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkNsb3VkRnJvbnQ6OkRpc3RyaWJ1dGlvbicsXG4gICAgICBjb25kaXRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmN1c3RvbVJlc291cmNlRGVmYXVsdERvbWFpbixcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6Q2xvdWRGb3JtYXRpb246OkN1c3RvbVJlc291cmNlJyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5kbnNSZWNvcmQsIHJlc291cmNlVHlwZTogJ0FXUzo6Um91dGU1Mzo6UmVjb3JkU2V0JywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGEsIHJlc291cmNlVHlwZTogJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5sYW1iZGFMb2dHcm91cCwgcmVzb3VyY2VUeXBlOiAnQVdTOjpMb2dzOjpMb2dHcm91cCcsIGNvbmRpdGlvbmFsOiB0cnVlIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMubGFtYmRhVXJsLCByZXNvdXJjZVR5cGU6ICdBV1M6OkxhbWJkYTo6VXJsJywgY29uZGl0aW9uYWw6IHRydWUgfVxuICBdLFxuXG4gIC8vID09PT09IENPTlZFWCA9PT09PVxuICAvLyBUT0RPKGNvbnZleCk6IHBvcHVsYXRlIHdpdGggYmFja2VuZCBzZXJ2aWNlLCBkYXNoYm9hcmQgc2VydmljZSwgQUxCLCBSRFMsIDUgYnVja2V0cywgYWRtaW4ta2V5IGN1c3RvbSByZXNvdXJjZS5cbiAgY29udmV4OiBbXSxcblxuICAvLyA9PT09PSBBR0VOVENPUkUgPT09PT1cbiAgJ2FnZW50Y29yZS1ydW50aW1lJzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmFnZW50Q29yZVJ1bnRpbWVSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy53b3JrbG9hZFNlY3VyaXR5R3JvdXAsIHJlc291cmNlVHlwZTogJ0FXUzo6RUMyOjpTZWN1cml0eUdyb3VwJywgY29uZGl0aW9uYWw6IHRydWUgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hZ2VudENvcmVSdW50aW1lLCByZXNvdXJjZVR5cGU6ICdBV1M6OkJlZHJvY2tBZ2VudENvcmU6OlJ1bnRpbWUnIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmFnZW50Q29yZVJ1bnRpbWVFbmRwb2ludCxcbiAgICAgIHJlc291cmNlVHlwZTogJ0FXUzo6QmVkcm9ja0FnZW50Q29yZTo6UnVudGltZUVuZHBvaW50JyxcbiAgICAgIGNvbmRpdGlvbmFsOiB0cnVlLFxuICAgICAgdW5yZXNvbHZhYmxlOiB0cnVlXG4gICAgfVxuICBdLFxuICAnYWdlbnRjb3JlLW1lbW9yeSc6IFt7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hZ2VudENvcmVNZW1vcnksIHJlc291cmNlVHlwZTogJ0FXUzo6QmVkcm9ja0FnZW50Q29yZTo6TWVtb3J5JyB9XSxcbiAgJ2FnZW50Y29yZS1nYXRld2F5JzogW1xuICAgIHsgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmFnZW50Q29yZUdhdGV3YXlSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hZ2VudENvcmVHYXRld2F5LCByZXNvdXJjZVR5cGU6ICdBV1M6OkJlZHJvY2tBZ2VudENvcmU6OkdhdGV3YXknIH0sXG4gICAge1xuICAgICAgbG9naWNhbE5hbWU6IGNmTG9naWNhbE5hbWVzLmFnZW50Q29yZUdhdGV3YXlUYXJnZXQsXG4gICAgICByZXNvdXJjZVR5cGU6ICdBV1M6OkJlZHJvY2tBZ2VudENvcmU6OkdhdGV3YXlUYXJnZXQnLFxuICAgICAgY29uZGl0aW9uYWw6IHRydWUsXG4gICAgICB1bnJlc29sdmFibGU6IHRydWVcbiAgICB9XG4gIF0sXG4gICdhZ2VudGNvcmUtYnJvd3Nlcic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hZ2VudENvcmVCcm93c2VyUm9sZSwgcmVzb3VyY2VUeXBlOiAnQVdTOjpJQU06OlJvbGUnIH0sXG4gICAgeyBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYWdlbnRDb3JlQnJvd3NlciwgcmVzb3VyY2VUeXBlOiAnQVdTOjpCZWRyb2NrQWdlbnRDb3JlOjpCcm93c2VyQ3VzdG9tJyB9XG4gIF0sXG4gICdhZ2VudGNvcmUtY29kZS1pbnRlcnByZXRlcic6IFtcbiAgICB7IGxvZ2ljYWxOYW1lOiBjZkxvZ2ljYWxOYW1lcy5hZ2VudENvcmVDb2RlSW50ZXJwcmV0ZXJSb2xlLCByZXNvdXJjZVR5cGU6ICdBV1M6OklBTTo6Um9sZScgfSxcbiAgICB7XG4gICAgICBsb2dpY2FsTmFtZTogY2ZMb2dpY2FsTmFtZXMuYWdlbnRDb3JlQ29kZUludGVycHJldGVyLFxuICAgICAgcmVzb3VyY2VUeXBlOiAnQVdTOjpCZWRyb2NrQWdlbnRDb3JlOjpDb2RlSW50ZXJwcmV0ZXJDdXN0b20nXG4gICAgfVxuICBdLFxuXG4gIC8vID09PT09IE9USEVSIFJFU09VUkNFUyA9PT09PVxuICAnY3VzdG9tLXJlc291cmNlLWluc3RhbmNlJzogW10sXG4gICdjdXN0b20tcmVzb3VyY2UtZGVmaW5pdGlvbic6IFtdLFxuICAnZGVwbG95bWVudC1zY3JpcHQnOiBbXSxcbiAgJ2F3cy1jZGstY29uc3RydWN0JzogW11cbn07XG4iLAogICAgImltcG9ydCB7IENISUxEX1JFU09VUkNFUyB9IGZyb20gJy4vY2hpbGQtcmVzb3VyY2VzJztcblxuLy8gUHJpdmF0ZSBzeW1ib2xzIGZvciBpbnRlcm5hbCBtZXRob2RzIC0gbm90IGFjY2Vzc2libGUgZnJvbSBvdXRzaWRlXG4vLyBVc2UgU3ltYm9sLmZvcigpIHNvIGl0IGNhbiBiZSBhY2Nlc3NlZCBhY3Jvc3MgbW9kdWxlcyAoY3J1Y2lhbCBmb3IgbnBtIHBhY2thZ2UgaW50ZXJvcClcbmNvbnN0IGdldFBhcmFtUmVmZXJlbmNlU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmdldFBhcmFtUmVmZXJlbmNlJyk7XG5jb25zdCBnZXRUeXBlU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmdldFR5cGUnKTtcbmNvbnN0IGdldFByb3BlcnRpZXNTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6Z2V0UHJvcGVydGllcycpO1xuY29uc3QgZ2V0T3ZlcnJpZGVzU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmdldE92ZXJyaWRlcycpO1xuY29uc3QgZ2V0VHJhbnNmb3Jtc1N5bWJvbCA9IFN5bWJvbC5mb3IoJ3N0YWNrdGFwZTpnZXRUcmFuc2Zvcm1zJyk7XG5jb25zdCBzZXRSZXNvdXJjZU5hbWVTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6c2V0UmVzb3VyY2VOYW1lJyk7XG5jb25zdCByZXNvdXJjZVBhcmFtUmVmU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmlzUmVzb3VyY2VQYXJhbVJlZicpO1xuY29uc3QgYmFzZVR5cGVQcm9wZXJ0aWVzU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmlzQmFzZVR5cGVQcm9wZXJ0aWVzJyk7XG5jb25zdCBhbGFybVN5bWJvbCA9IFN5bWJvbC5mb3IoJ3N0YWNrdGFwZTppc0FsYXJtJyk7XG5cbi8vIER1Y2stdHlwZSBjaGVja2VycyAtIHVzZSBzeW1ib2xzIGluc3RlYWQgb2YgaW5zdGFuY2VvZiBmb3IgY3Jvc3MtbW9kdWxlIGNvbXBhdGliaWxpdHlcbmNvbnN0IGlzQmFzZVJlc291cmNlID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgQmFzZVJlc291cmNlID0+XG4gIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgc2V0UmVzb3VyY2VOYW1lU3ltYm9sIGluIHZhbHVlO1xuXG5jb25zdCBpc0Jhc2VUeXBlUHJvcGVydGllcyA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEJhc2VUeXBlUHJvcGVydGllcyA9PlxuICB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIGJhc2VUeXBlUHJvcGVydGllc1N5bWJvbCBpbiB2YWx1ZTtcblxuY29uc3QgaXNBbGFybSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEFsYXJtID0+IHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgYWxhcm1TeW1ib2wgaW4gdmFsdWU7XG5cbmNvbnN0IGlzUmVzb3VyY2VQYXJhbVJlZmVyZW5jZSA9ICh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlc291cmNlUGFyYW1SZWZlcmVuY2UgPT5cbiAgdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiByZXNvdXJjZVBhcmFtUmVmU3ltYm9sIGluIHZhbHVlO1xuXG5jb25zdCBkZWZlcnJlZE5hbWVTeW1ib2wgPSBTeW1ib2wuZm9yKCdzdGFja3RhcGU6aXNEZWZlcnJlZFJlc291cmNlTmFtZScpO1xuXG5jb25zdCBpc0RlZmVycmVkUmVzb3VyY2VOYW1lID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgRGVmZXJyZWRSZXNvdXJjZU5hbWUgPT5cbiAgdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiBkZWZlcnJlZE5hbWVTeW1ib2wgaW4gdmFsdWU7XG5cbi8qKlxuICogQSBkZWZlcnJlZCByZWZlcmVuY2UgdG8gYSByZXNvdXJjZSdzIG5hbWUuXG4gKiBVc2VkIHdoZW4gYWNjZXNzaW5nIHJlc291cmNlTmFtZSBiZWZvcmUgdGhlIG5hbWUgaXMgc2V0LlxuICogUmVzb2x2ZXMgbGF6aWx5IGR1cmluZyB0cmFuc2Zvcm1hdGlvbi5cbiAqL1xuY2xhc3MgRGVmZXJyZWRSZXNvdXJjZU5hbWUge1xuICBwcml2YXRlIF9fcmVzb3VyY2U6IEJhc2VSZXNvdXJjZTtcbiAgcmVhZG9ubHkgW2RlZmVycmVkTmFtZVN5bWJvbF0gPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKHJlc291cmNlOiBCYXNlUmVzb3VyY2UpIHtcbiAgICB0aGlzLl9fcmVzb3VyY2UgPSByZXNvdXJjZTtcbiAgfVxuXG4gIHJlc29sdmUoKTogc3RyaW5nIHtcbiAgICAvLyBBdCByZXNvbHV0aW9uIHRpbWUsIHRoZSBuYW1lIHNob3VsZCBiZSBzZXRcbiAgICBjb25zdCBuYW1lID0gKHRoaXMuX19yZXNvdXJjZSBhcyBhbnkpLl9yZXNvdXJjZU5hbWU7XG4gICAgaWYgKG5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnUmVzb3VyY2UgbmFtZSBub3Qgc2V0LiBNYWtlIHN1cmUgdG8gYWRkIHRoZSByZXNvdXJjZSB0byB0aGUgcmVzb3VyY2VzIG9iamVjdCBpbiB5b3VyIGNvbmZpZy4gJyArXG4gICAgICAgICAgJ1RoZSByZXNvdXJjZSBuYW1lIGlzIGF1dG9tYXRpY2FsbHkgZGVyaXZlZCBmcm9tIHRoZSBvYmplY3Qga2V5LidcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlKCk7XG4gIH1cblxuICB0b0pTT04oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5yZXNvbHZlKCk7XG4gIH1cblxuICB2YWx1ZU9mKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZSgpO1xuICB9XG59XG5cbi8qKlxuICogQSByZWZlcmVuY2UgdG8gYSByZXNvdXJjZSBwYXJhbWV0ZXIgdGhhdCB3aWxsIGJlIHJlc29sdmVkIGF0IHJ1bnRpbWUuXG4gKiBTdG9yZXMgYSByZWZlcmVuY2UgdG8gdGhlIHJlc291cmNlIGZvciBsYXp5IG5hbWUgcmVzb2x1dGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc291cmNlUGFyYW1SZWZlcmVuY2Uge1xuICBwcml2YXRlIF9fcmVzb3VyY2U6IEJhc2VSZXNvdXJjZTtcbiAgcHJpdmF0ZSBfX3BhcmFtOiBzdHJpbmc7XG4gIHJlYWRvbmx5IFtyZXNvdXJjZVBhcmFtUmVmU3ltYm9sXSA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IocmVzb3VyY2U6IEJhc2VSZXNvdXJjZSwgcGFyYW06IHN0cmluZykge1xuICAgIHRoaXMuX19yZXNvdXJjZSA9IHJlc291cmNlO1xuICAgIHRoaXMuX19wYXJhbSA9IHBhcmFtO1xuICB9XG5cbiAgdG9TdHJpbmcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCRSZXNvdXJjZVBhcmFtKCcke3RoaXMuX19yZXNvdXJjZS5yZXNvdXJjZU5hbWV9JywgJyR7dGhpcy5fX3BhcmFtfScpYDtcbiAgfVxuXG4gIHRvSlNPTigpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG4gIH1cblxuICAvLyBBbGxvdyB0aGUgcmVmZXJlbmNlIHRvIGJlIHVzZWQgZGlyZWN0bHkgaW4gdGVtcGxhdGUgc3RyaW5nc1xuICB2YWx1ZU9mKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcbiAgfVxufVxuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIHR5cGUvcHJvcGVydGllcyBzdHJ1Y3R1cmVzIChlbmdpbmVzLCBwYWNrYWdpbmcsIGV2ZW50cywgZXRjLilcbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2VUeXBlUHJvcGVydGllcyB7XG4gIHB1YmxpYyByZWFkb25seSB0eXBlOiBzdHJpbmc7XG4gIHB1YmxpYyByZWFkb25seSBwcm9wZXJ0aWVzOiBhbnk7XG4gIHJlYWRvbmx5IFtiYXNlVHlwZVByb3BlcnRpZXNTeW1ib2xdID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3Rvcih0eXBlOiBzdHJpbmcsIHByb3BlcnRpZXM6IGFueSkge1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy5wcm9wZXJ0aWVzID0gcHJvcGVydGllcztcbiAgfVxufVxuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIHR5cGUtb25seSBzdHJ1Y3R1cmVzIChubyBwcm9wZXJ0aWVzIGZpZWxkLCBqdXN0IHR5cGUgZGlzY3JpbWluYXRvcilcbiAqL1xuZXhwb3J0IGNsYXNzIEJhc2VUeXBlT25seSB7XG4gIHB1YmxpYyByZWFkb25seSB0eXBlOiBzdHJpbmc7XG4gIHJlYWRvbmx5IFtiYXNlVHlwZVByb3BlcnRpZXNTeW1ib2xdID0gdHJ1ZTtcblxuICBjb25zdHJ1Y3Rvcih0eXBlOiBzdHJpbmcpIHtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICB9XG59XG5cbi8qKlxuICogRGVmaW5lcyBhIENsb3VkV2F0Y2ggYWxhcm0gdGhhdCBtb25pdG9ycyBhIG1ldHJpYyBhbmQgdHJpZ2dlcnMgbm90aWZpY2F0aW9ucyB3aGVuIHRocmVzaG9sZHMgYXJlIGJyZWFjaGVkLlxuICpcbiAqIEFsYXJtcyBjYW4gYmUgYXR0YWNoZWQgdG8gcmVzb3VyY2VzIGxpa2UgTGFtYmRhIGZ1bmN0aW9ucywgZGF0YWJhc2VzLCBsb2FkIGJhbGFuY2VycywgU1FTIHF1ZXVlcywgYW5kIEhUVFAgQVBJIEdhdGV3YXlzLlxuICogV2hlbiB0aGUgYWxhcm0gY29uZGl0aW9uIGlzIG1ldCAoZS5nLiwgZXJyb3IgcmF0ZSBleGNlZWRzIDUlKSwgbm90aWZpY2F0aW9ucyBhcmUgc2VudCB0byBjb25maWd1cmVkIHRhcmdldHMgKFNsYWNrLCBlbWFpbCwgTVMgVGVhbXMpLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogbmV3IEFsYXJtKHtcbiAqICAgdHJpZ2dlcjogbmV3IExhbWJkYUVycm9yUmF0ZVRyaWdnZXIoeyB0aHJlc2hvbGRQZXJjZW50OiA1IH0pLFxuICogICBldmFsdWF0aW9uOiB7IHBlcmlvZDogNjAsIGV2YWx1YXRpb25QZXJpb2RzOiAzLCBicmVhY2hlZFBlcmlvZHM6IDIgfSxcbiAqICAgbm90aWZpY2F0aW9uVGFyZ2V0czogW3sgc2xhY2s6IHsgdXJsOiAkU2VjcmV0KCdzbGFjay13ZWJob29rLXVybCcpIH0gfV0sXG4gKiAgIGRlc2NyaXB0aW9uOiAnTGFtYmRhIGVycm9yIHJhdGUgZXhjZWVkZWQgNSUnXG4gKiB9KVxuICogYGBgXG4gKi9cbmV4cG9ydCBjbGFzcyBBbGFybSB7XG4gIHJlYWRvbmx5IFthbGFybVN5bWJvbF0gPSB0cnVlO1xuICBwdWJsaWMgcmVhZG9ubHkgdHJpZ2dlcjogYW55O1xuICBwdWJsaWMgcmVhZG9ubHkgZXZhbHVhdGlvbj86IGFueTtcbiAgcHVibGljIHJlYWRvbmx5IG5vdGlmaWNhdGlvblRhcmdldHM/OiBhbnlbXTtcbiAgcHVibGljIHJlYWRvbmx5IGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHByb3BzOiB7IHRyaWdnZXI6IGFueTsgZXZhbHVhdGlvbj86IGFueTsgbm90aWZpY2F0aW9uVGFyZ2V0cz86IGFueVtdOyBkZXNjcmlwdGlvbj86IHN0cmluZyB9KSB7XG4gICAgdGhpcy50cmlnZ2VyID0gcHJvcHMudHJpZ2dlcjtcbiAgICB0aGlzLmV2YWx1YXRpb24gPSBwcm9wcy5ldmFsdWF0aW9uO1xuICAgIHRoaXMubm90aWZpY2F0aW9uVGFyZ2V0cyA9IHByb3BzLm5vdGlmaWNhdGlvblRhcmdldHM7XG4gICAgdGhpcy5kZXNjcmlwdGlvbiA9IHByb3BzLmRlc2NyaXB0aW9uO1xuICB9XG59XG5cbi8qKlxuICogQmFzZSByZXNvdXJjZSBjbGFzcyB0aGF0IHByb3ZpZGVzIGNvbW1vbiBmdW5jdGlvbmFsaXR5XG4gKi9cbmV4cG9ydCBjbGFzcyBCYXNlUmVzb3VyY2Uge1xuICBwcml2YXRlIHJlYWRvbmx5IF90eXBlOiBzdHJpbmc7XG4gIHByaXZhdGUgX3Byb3BlcnRpZXM6IGFueTtcbiAgcHJpdmF0ZSBfb3ZlcnJpZGVzPzogYW55O1xuICBwcml2YXRlIF90cmFuc2Zvcm1zPzogYW55O1xuICBwcml2YXRlIF9yZXNvdXJjZU5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBfZXhwbGljaXROYW1lOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCwgdHlwZTogc3RyaW5nLCBwcm9wZXJ0aWVzOiBhbnksIG92ZXJyaWRlcz86IGFueSkge1xuICAgIHRoaXMuX3Jlc291cmNlTmFtZSA9IG5hbWU7XG4gICAgdGhpcy5fZXhwbGljaXROYW1lID0gbmFtZSAhPT0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuXG4gICAgLy8gU3RvcmUgcHJvcGVydGllcyBhbmQgb3ZlcnJpZGVzIGluaXRpYWxseSAtIHRoZXknbGwgYmUgcHJvY2Vzc2VkIHdoZW4gbmFtZSBpcyBzZXRcbiAgICB0aGlzLl9wcm9wZXJ0aWVzID0gcHJvcGVydGllcztcbiAgICB0aGlzLl9vdmVycmlkZXMgPSBvdmVycmlkZXM7XG5cbiAgICAvLyBJZiBuYW1lIGlzIGFscmVhZHkgc2V0LCBwcm9jZXNzIG92ZXJyaWRlcyBhbmQgdHJhbnNmb3JtcyBub3dcbiAgICBpZiAobmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9wcm9jZXNzT3ZlcnJpZGVzQW5kVHJhbnNmb3JtcygpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIG92ZXJyaWRlcyBhbmQgdHJhbnNmb3JtcyBleHRyYWN0aW9uIGZyb20gcHJvcGVydGllcy5cbiAgICogQ2FsbGVkIHdoZW4gdGhlIHJlc291cmNlIG5hbWUgaXMgYXZhaWxhYmxlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcHJvY2Vzc092ZXJyaWRlc0FuZFRyYW5zZm9ybXMoKTogdm9pZCB7XG4gICAgY29uc3QgcHJvcGVydGllcyA9IHRoaXMuX3Byb3BlcnRpZXM7XG4gICAgaWYgKHByb3BlcnRpZXMgJiYgdHlwZW9mIHByb3BlcnRpZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBDbG9uZSBwcm9wZXJ0aWVzIHdpdGhvdXQgb3ZlcnJpZGVzIGFuZCB0cmFuc2Zvcm1zXG4gICAgICBjb25zdCBmaW5hbFByb3BlcnRpZXMgPSB7IC4uLnByb3BlcnRpZXMgfTtcblxuICAgICAgLy8gSGFuZGxlIG92ZXJyaWRlcyBmcm9tIHByb3BlcnRpZXMgKGlmIHRoZXkgd2VyZW4ndCBleHRyYWN0ZWQgYnkgY2hpbGQgY2xhc3MpXG4gICAgICBpZiAoJ292ZXJyaWRlcycgaW4gZmluYWxQcm9wZXJ0aWVzKSB7XG4gICAgICAgIGNvbnN0IHByb3BlcnRpZXNPdmVycmlkZXMgPSBmaW5hbFByb3BlcnRpZXMub3ZlcnJpZGVzO1xuICAgICAgICBkZWxldGUgZmluYWxQcm9wZXJ0aWVzLm92ZXJyaWRlcztcblxuICAgICAgICAvLyBUcmFuc2Zvcm0gb3ZlcnJpZGVzIHVzaW5nIGNmTG9naWNhbE5hbWVzXG4gICAgICAgIGlmIChwcm9wZXJ0aWVzT3ZlcnJpZGVzICYmIHR5cGVvZiBwcm9wZXJ0aWVzT3ZlcnJpZGVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIHRoaXMuX292ZXJyaWRlcyA9IHRyYW5zZm9ybU92ZXJyaWRlc1RvTG9naWNhbE5hbWVzKHRoaXMuX3Jlc291cmNlTmFtZSEsIHRoaXMuX3R5cGUsIHByb3BlcnRpZXNPdmVycmlkZXMpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEhhbmRsZSB0cmFuc2Zvcm1zIGZyb20gcHJvcGVydGllcyAoaWYgdGhleSB3ZXJlbid0IGV4dHJhY3RlZCBieSBjaGlsZCBjbGFzcylcbiAgICAgIGlmICgndHJhbnNmb3JtcycgaW4gZmluYWxQcm9wZXJ0aWVzKSB7XG4gICAgICAgIGNvbnN0IHByb3BlcnRpZXNUcmFuc2Zvcm1zID0gZmluYWxQcm9wZXJ0aWVzLnRyYW5zZm9ybXM7XG4gICAgICAgIGRlbGV0ZSBmaW5hbFByb3BlcnRpZXMudHJhbnNmb3JtcztcblxuICAgICAgICAvLyBUcmFuc2Zvcm0gdHJhbnNmb3JtcyB1c2luZyBjZkxvZ2ljYWxOYW1lcyAoc2FtZSBtYXBwaW5nIGFzIG92ZXJyaWRlcylcbiAgICAgICAgaWYgKHByb3BlcnRpZXNUcmFuc2Zvcm1zICYmIHR5cGVvZiBwcm9wZXJ0aWVzVHJhbnNmb3JtcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICB0aGlzLl90cmFuc2Zvcm1zID0gdHJhbnNmb3JtVHJhbnNmb3Jtc1RvTG9naWNhbE5hbWVzKHRoaXMuX3Jlc291cmNlTmFtZSEsIHRoaXMuX3R5cGUsIHByb3BlcnRpZXNUcmFuc2Zvcm1zKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLl9wcm9wZXJ0aWVzID0gZmluYWxQcm9wZXJ0aWVzO1xuICAgIH1cblxuICAgIC8vIEFsc28gdHJhbnNmb3JtIG92ZXJyaWRlcy90cmFuc2Zvcm1zIHRoYXQgd2VyZSBwYXNzZWQgZGlyZWN0bHkgdmlhIGNvbnN0cnVjdG9yXG4gICAgLy8gKHdoZW4gY2hpbGQgY2xhc3MgZXh0cmFjdHMgdGhlbSBiZWZvcmUgY2FsbGluZyBzdXBlcilcbiAgICBpZiAodGhpcy5fb3ZlcnJpZGVzICYmIHR5cGVvZiB0aGlzLl9vdmVycmlkZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICB0aGlzLl9vdmVycmlkZXMgPSB0cmFuc2Zvcm1PdmVycmlkZXNUb0xvZ2ljYWxOYW1lcyh0aGlzLl9yZXNvdXJjZU5hbWUhLCB0aGlzLl90eXBlLCB0aGlzLl9vdmVycmlkZXMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5fdHJhbnNmb3JtcyAmJiB0eXBlb2YgdGhpcy5fdHJhbnNmb3JtcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHRoaXMuX3RyYW5zZm9ybXMgPSB0cmFuc2Zvcm1UcmFuc2Zvcm1zVG9Mb2dpY2FsTmFtZXModGhpcy5fcmVzb3VyY2VOYW1lISwgdGhpcy5fdHlwZSwgdGhpcy5fdHJhbnNmb3Jtcyk7XG4gICAgfVxuICB9XG5cbiAgLy8gUHVibGljIGdldHRlciBmb3IgcmVzb3VyY2UgbmFtZSAodXNlZCBmb3IgcmVmZXJlbmNpbmcgcmVzb3VyY2VzKVxuICAvLyBSZXR1cm5zIGEgZGVmZXJyZWQgcmVmZXJlbmNlIHdoZW4gbmFtZSBpc24ndCBzZXQgeWV0LCB3aGljaCByZXNvbHZlcyBkdXJpbmcgdHJhbnNmb3JtYXRpb25cbiAgZ2V0IHJlc291cmNlTmFtZSgpOiBzdHJpbmcge1xuICAgIGlmICh0aGlzLl9yZXNvdXJjZU5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gUmV0dXJuIGEgZGVmZXJyZWQgcmVmZXJlbmNlIHRoYXQgd2lsbCByZXNvbHZlIGR1cmluZyB0cmFuc2Zvcm1hdGlvblxuICAgICAgLy8gVHlwZVNjcmlwdCBzZWVzIHRoaXMgYXMgc3RyaW5nIGR1ZSB0byB0b1N0cmluZy92YWx1ZU9mLCBydW50aW1lIHJlc29sdmVzIGxhemlseVxuICAgICAgcmV0dXJuIG5ldyBEZWZlcnJlZFJlc291cmNlTmFtZSh0aGlzKSBhcyB1bmtub3duIGFzIHN0cmluZztcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3Jlc291cmNlTmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBtZXRob2QgdG8gc2V0IHRoZSByZXNvdXJjZSBuYW1lIGZyb20gdGhlIG9iamVjdCBrZXkuXG4gICAqIENhbGxlZCBieSB0cmFuc2Zvcm1Db25maWdXaXRoUmVzb3VyY2VzLlxuICAgKi9cbiAgW3NldFJlc291cmNlTmFtZVN5bWJvbF0obmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX2V4cGxpY2l0TmFtZSAmJiB0aGlzLl9yZXNvdXJjZU5hbWUgIT09IG5hbWUpIHtcbiAgICAgIC8vIElmIGFuIGV4cGxpY2l0IG5hbWUgd2FzIHByb3ZpZGVkIGFuZCBpdCBkaWZmZXJzIGZyb20gdGhlIGtleSwgdXNlIHRoZSBleHBsaWNpdCBuYW1lXG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLl9yZXNvdXJjZU5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5fcmVzb3VyY2VOYW1lID0gbmFtZTtcbiAgICAgIC8vIE5vdyB0aGF0IHdlIGhhdmUgYSBuYW1lLCBwcm9jZXNzIG92ZXJyaWRlcyBhbmQgdHJhbnNmb3Jtc1xuICAgICAgdGhpcy5fcHJvY2Vzc092ZXJyaWRlc0FuZFRyYW5zZm9ybXMoKTtcbiAgICB9XG4gIH1cblxuICAvLyBQcml2YXRlIG1ldGhvZHMgdXNpbmcgc3ltYm9scyAtIG5vdCBhY2Nlc3NpYmxlIGZyb20gb3V0c2lkZSBvciBpbiBhdXRvY29tcGxldGVcbiAgW2dldFBhcmFtUmVmZXJlbmNlU3ltYm9sXShwYXJhbU5hbWU6IHN0cmluZyk6IFJlc291cmNlUGFyYW1SZWZlcmVuY2Uge1xuICAgIHJldHVybiBuZXcgUmVzb3VyY2VQYXJhbVJlZmVyZW5jZSh0aGlzLCBwYXJhbU5hbWUpO1xuICB9XG5cbiAgW2dldFR5cGVTeW1ib2xdKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX3R5cGU7XG4gIH1cblxuICBbZ2V0UHJvcGVydGllc1N5bWJvbF0oKTogYW55IHtcbiAgICByZXR1cm4gdGhpcy5fcHJvcGVydGllcztcbiAgfVxuXG4gIFtnZXRPdmVycmlkZXNTeW1ib2xdKCk6IGFueSB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuX292ZXJyaWRlcztcbiAgfVxuXG4gIFtnZXRUcmFuc2Zvcm1zU3ltYm9sXSgpOiBhbnkgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl90cmFuc2Zvcm1zO1xuICB9XG59XG5cbi8qKlxuICogRmxhdHRlbiBuZXN0ZWQgb2JqZWN0cyBpbnRvIGRvdC1ub3RhdGlvbiBwYXRocy5cbiAqIEUuZy4sIHsgU21zQ29uZmlndXJhdGlvbjogeyBFeHRlcm5hbElkOiAndmFsdWUnIH0gfSBiZWNvbWVzIHsgJ1Ntc0NvbmZpZ3VyYXRpb24uRXh0ZXJuYWxJZCc6ICd2YWx1ZScgfVxuICogUHJlc2VydmVzIGFycmF5cywgbm9uLXBsYWluIG9iamVjdHMsIGFuZCBtYXAtbGlrZSBvYmplY3RzIHdpdGggc3BlY2lhbCBrZXlzIGFzIGxlYWYgdmFsdWVzLlxuICovXG5mdW5jdGlvbiBmbGF0dGVuVG9Eb3ROb3RhdGlvbihvYmo6IGFueSwgcHJlZml4ID0gJycpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG5cbiAgZm9yIChjb25zdCBrZXkgaW4gb2JqKSB7XG4gICAgY29uc3QgdmFsdWUgPSBvYmpba2V5XTtcbiAgICBjb25zdCBuZXdLZXkgPSBwcmVmaXggPyBgJHtwcmVmaXh9LiR7a2V5fWAgOiBrZXk7XG5cbiAgICAvLyBDaGVjayBpZiB2YWx1ZSBpcyBhIHBsYWluIG9iamVjdCAobm90IGFycmF5LCBub3QgbnVsbCwgbm90IHNwZWNpYWwgdHlwZXMpXG4gICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmNvbnN0cnVjdG9yID09PSBPYmplY3QpIHtcbiAgICAgIC8vIFByZXNlcnZlIG1hcC1saWtlIG9iamVjdHMgd2l0aCBub24tcGF0aC1zYWZlIGtleXMgKGZvciBleGFtcGxlXG4gICAgICAvLyBSRFMgcGFyYW1ldGVyIG5hbWVzIGxpa2UgXCJyZHMuYWxsb3dlZF9leHRlbnNpb25zXCIgb3IgT3BlblNlYXJjaCBvcHRpb25zKS5cbiAgICAgIC8vIFRoaXMgcHJldmVudHMgc3BsaXR0aW5nIGxpdGVyYWwga2V5cyBpbnRvIG5lc3RlZCBwYXRocyBsYXRlci5cbiAgICAgIGlmIChPYmplY3Qua2V5cyh2YWx1ZSkuc29tZSgoY2hpbGRLZXkpID0+ICEvXltBLVphLXowLTlfXSskLy50ZXN0KGNoaWxkS2V5KSkpIHtcbiAgICAgICAgcmVzdWx0W25ld0tleV0gPSB2YWx1ZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBSZWN1cnNpdmVseSBmbGF0dGVuIG5lc3RlZCBvYmplY3RzXG4gICAgICBPYmplY3QuYXNzaWduKHJlc3VsdCwgZmxhdHRlblRvRG90Tm90YXRpb24odmFsdWUsIG5ld0tleSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBMZWFmIHZhbHVlIC0ga2VlcCBhcyBpc1xuICAgICAgcmVzdWx0W25ld0tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIFRyYW5zZm9ybSB1c2VyLWZyaWVuZGx5IG92ZXJyaWRlcyAod2l0aCBwcm9wZXJ0eSBuYW1lcyBsaWtlICdidWNrZXQnLCAnbGFtYmRhTG9nR3JvdXAnKVxuICogdG8gQ2xvdWRGb3JtYXRpb24gbG9naWNhbCBuYW1lcyB1c2luZyBjZkxvZ2ljYWxOYW1lc1xuICovXG5mdW5jdGlvbiB0cmFuc2Zvcm1PdmVycmlkZXNUb0xvZ2ljYWxOYW1lcyhyZXNvdXJjZU5hbWU6IHN0cmluZywgcmVzb3VyY2VUeXBlOiBzdHJpbmcsIG92ZXJyaWRlczogYW55KTogYW55IHtcbiAgLy8gR2V0IGNoaWxkIHJlc291cmNlcyBmb3IgdGhpcyByZXNvdXJjZSB0eXBlXG4gIGNvbnN0IGNoaWxkUmVzb3VyY2VzID0gQ0hJTERfUkVTT1VSQ0VTW3Jlc291cmNlVHlwZV0gfHwgW107XG5cbiAgLy8gQnVpbGQgYSBtYXAgb2YgcHJvcGVydHkgbmFtZXMgdG8gY2hpbGQgcmVzb3VyY2VzXG4gIGNvbnN0IHByb3BlcnR5TmFtZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBhbnk+KCk7XG5cbiAgZm9yIChjb25zdCBjaGlsZFJlc291cmNlIG9mIGNoaWxkUmVzb3VyY2VzKSB7XG4gICAgLy8gVGhlIGxvZ2ljYWxOYW1lIGZ1bmN0aW9uIGhhcyBhIG5hbWUgcHJvcGVydHkgdGhhdCBtYXRjaGVzIHRoZSBwcm9wZXJ0eSBuYW1lXG4gICAgaWYgKGNoaWxkUmVzb3VyY2UubG9naWNhbE5hbWUgJiYgY2hpbGRSZXNvdXJjZS5sb2dpY2FsTmFtZS5uYW1lKSB7XG4gICAgICBwcm9wZXJ0eU5hbWVNYXAuc2V0KGNoaWxkUmVzb3VyY2UubG9naWNhbE5hbWUubmFtZSwgY2hpbGRSZXNvdXJjZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gVHJhbnNmb3JtIG92ZXJyaWRlcyBvYmplY3RcbiAgY29uc3QgdHJhbnNmb3JtZWRPdmVycmlkZXM6IGFueSA9IHt9O1xuICBjb25zdCBlcnJvck1lc3NhZ2UgPSBgT3ZlcnJpZGUgb2YgcHJvcGVydHkge3Byb3BlcnR5TmFtZX0gb2YgcmVzb3VyY2UgJHtyZXNvdXJjZU5hbWV9IGlzIG5vdCBzdXBwb3J0ZWQuXFxuXG5SZW1vdmUgdGhlIG92ZXJyaWRlLCBydW4gJ3N0YWNrdGFwZSBjb21waWxlOnRlbXBsYXRlJyBjb21tYW5kLCBhbmQgZmluZCB0aGUgbG9naWNhbCBuYW1lIG9mIHRoZSByZXNvdXJjZSB5b3Ugd2FudCB0byBvdmVycmlkZSBtYW51YWxseS4gVGhlbiBhZGQgaXQgdG8gdGhlIG92ZXJyaWRlcyBvYmplY3QuYDtcblxuICBmb3IgKGNvbnN0IHByb3BlcnR5TmFtZSBpbiBvdmVycmlkZXMpIHtcbiAgICBjb25zdCBjaGlsZFJlc291cmNlID0gcHJvcGVydHlOYW1lTWFwLmdldChwcm9wZXJ0eU5hbWUpO1xuXG4gICAgLy8gU2tpcCB1bnJlc29sdmFibGUgcmVzb3VyY2VzXG4gICAgaWYgKGNoaWxkUmVzb3VyY2U/LnVucmVzb2x2YWJsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yTWVzc2FnZS5yZXBsYWNlKCd7cHJvcGVydHlOYW1lfScsIHByb3BlcnR5TmFtZSkpO1xuICAgIH1cblxuICAgIGlmIChjaGlsZFJlc291cmNlKSB7XG4gICAgICBjb25zdCBsb2dpY2FsTmFtZUZuID0gY2hpbGRSZXNvdXJjZS5sb2dpY2FsTmFtZTtcbiAgICAgIC8vIENhbGwgdGhlIGNmTG9naWNhbE5hbWVzIGZ1bmN0aW9uIHRvIGdldCB0aGUgYWN0dWFsIENsb3VkRm9ybWF0aW9uIGxvZ2ljYWwgbmFtZVxuICAgICAgLy8gVHJ5IHdpdGggcmVzb3VyY2VOYW1lIGZpcnN0IChtb3N0IGNvbW1vbiksIHRoZW4gdHJ5IHdpdGhvdXQgYXJndW1lbnRzXG4gICAgICBsZXQgbG9naWNhbE5hbWU6IHN0cmluZztcbiAgICAgIHRyeSB7XG4gICAgICAgIGxvZ2ljYWxOYW1lID0gbG9naWNhbE5hbWVGbihyZXNvdXJjZU5hbWUpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbG9naWNhbE5hbWUgPSBsb2dpY2FsTmFtZUZuKCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIC8vIElmIGJvdGggZmFpbCwgdXNlIHByb3BlcnR5IG5hbWUgYXMtaXNcbiAgICAgICAgICBsb2dpY2FsTmFtZSA9IHByb3BlcnR5TmFtZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGxvZ2ljYWxOYW1lLmluY2x1ZGVzKCd1bmRlZmluZWQnKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNZXNzYWdlLnJlcGxhY2UoJ3twcm9wZXJ0eU5hbWV9JywgcHJvcGVydHlOYW1lKSk7XG4gICAgICB9XG4gICAgICAvLyBXaGVuIHVzaW5nIFNESyBwcm9wZXJ0eSBuYW1lcywgZmxhdHRlbiBuZXN0ZWQgb2JqZWN0cyB0byBkb3Qtbm90YXRpb25cbiAgICAgIC8vIHNvIHsgU21zQ29uZmlndXJhdGlvbjogeyBFeHRlcm5hbElkOiAneCcgfSB9IGJlY29tZXMgeyAnU21zQ29uZmlndXJhdGlvbi5FeHRlcm5hbElkJzogJ3gnIH1cbiAgICAgIGNvbnN0IG92ZXJyaWRlVmFsdWUgPSBvdmVycmlkZXNbcHJvcGVydHlOYW1lXTtcbiAgICAgIGlmICghdHJhbnNmb3JtZWRPdmVycmlkZXNbbG9naWNhbE5hbWVdKSB7XG4gICAgICAgIHRyYW5zZm9ybWVkT3ZlcnJpZGVzW2xvZ2ljYWxOYW1lXSA9IHt9O1xuICAgICAgfVxuICAgICAgT2JqZWN0LmFzc2lnbih0cmFuc2Zvcm1lZE92ZXJyaWRlc1tsb2dpY2FsTmFtZV0sIGZsYXR0ZW5Ub0RvdE5vdGF0aW9uKG92ZXJyaWRlVmFsdWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgbm90IGZvdW5kIGluIG1hcCwgdXNlIHByb3BlcnR5IG5hbWUgYXMtaXMgKENGIGxvZ2ljYWwgbmFtZSB1c2VkIGRpcmVjdGx5KVxuICAgICAgLy8gRG9uJ3QgZmxhdHRlbiAtIHVzZXIgaXMgdXNpbmcgQ0YgbG9naWNhbCBuYW1lcyBhbmQgbWF5IHdhbnQgZnVsbCBvYmplY3QgcmVwbGFjZW1lbnRcbiAgICAgIHRyYW5zZm9ybWVkT3ZlcnJpZGVzW3Byb3BlcnR5TmFtZV0gPSBvdmVycmlkZXNbcHJvcGVydHlOYW1lXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJhbnNmb3JtZWRPdmVycmlkZXM7XG59XG5cbi8qKlxuICogVHJhbnNmb3JtIHVzZXItZnJpZW5kbHkgdHJhbnNmb3JtcyAod2l0aCBwcm9wZXJ0eSBuYW1lcyBsaWtlICdsYW1iZGEnLCAnbGFtYmRhTG9nR3JvdXAnKVxuICogdG8gQ2xvdWRGb3JtYXRpb24gbG9naWNhbCBuYW1lcyB1c2luZyBjZkxvZ2ljYWxOYW1lc1xuICogU2ltaWxhciB0byBvdmVycmlkZXMgYnV0IHRoZSB2YWx1ZXMgYXJlIGZ1bmN0aW9ucyBpbnN0ZWFkIG9mIG9iamVjdHNcbiAqL1xuZnVuY3Rpb24gdHJhbnNmb3JtVHJhbnNmb3Jtc1RvTG9naWNhbE5hbWVzKHJlc291cmNlTmFtZTogc3RyaW5nLCByZXNvdXJjZVR5cGU6IHN0cmluZywgdHJhbnNmb3JtczogYW55KTogYW55IHtcbiAgLy8gR2V0IGNoaWxkIHJlc291cmNlcyBmb3IgdGhpcyByZXNvdXJjZSB0eXBlXG4gIGNvbnN0IGNoaWxkUmVzb3VyY2VzID0gQ0hJTERfUkVTT1VSQ0VTW3Jlc291cmNlVHlwZV0gfHwgW107XG5cbiAgLy8gQnVpbGQgYSBtYXAgb2YgcHJvcGVydHkgbmFtZXMgdG8gY2hpbGQgcmVzb3VyY2VzXG4gIGNvbnN0IHByb3BlcnR5TmFtZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBhbnk+KCk7XG5cbiAgZm9yIChjb25zdCBjaGlsZFJlc291cmNlIG9mIGNoaWxkUmVzb3VyY2VzKSB7XG4gICAgLy8gVGhlIGxvZ2ljYWxOYW1lIGZ1bmN0aW9uIGhhcyBhIG5hbWUgcHJvcGVydHkgdGhhdCBtYXRjaGVzIHRoZSBwcm9wZXJ0eSBuYW1lXG4gICAgaWYgKGNoaWxkUmVzb3VyY2UubG9naWNhbE5hbWUgJiYgY2hpbGRSZXNvdXJjZS5sb2dpY2FsTmFtZS5uYW1lKSB7XG4gICAgICBwcm9wZXJ0eU5hbWVNYXAuc2V0KGNoaWxkUmVzb3VyY2UubG9naWNhbE5hbWUubmFtZSwgY2hpbGRSZXNvdXJjZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gVHJhbnNmb3JtIHRyYW5zZm9ybXMgb2JqZWN0XG4gIGNvbnN0IHRyYW5zZm9ybWVkVHJhbnNmb3JtczogYW55ID0ge307XG4gIGNvbnN0IGVycm9yTWVzc2FnZSA9IGBUcmFuc2Zvcm0gb2YgcHJvcGVydHkge3Byb3BlcnR5TmFtZX0gb2YgcmVzb3VyY2UgJHtyZXNvdXJjZU5hbWV9IGlzIG5vdCBzdXBwb3J0ZWQuXFxuXG5SZW1vdmUgdGhlIHRyYW5zZm9ybSwgcnVuICdzdGFja3RhcGUgY29tcGlsZTp0ZW1wbGF0ZScgY29tbWFuZCwgYW5kIGZpbmQgdGhlIGxvZ2ljYWwgbmFtZSBvZiB0aGUgcmVzb3VyY2UgeW91IHdhbnQgdG8gdHJhbnNmb3JtIG1hbnVhbGx5LiBUaGVuIGFkZCBpdCB0byB0aGUgdHJhbnNmb3JtcyBvYmplY3QuYDtcblxuICBmb3IgKGNvbnN0IHByb3BlcnR5TmFtZSBpbiB0cmFuc2Zvcm1zKSB7XG4gICAgY29uc3QgY2hpbGRSZXNvdXJjZSA9IHByb3BlcnR5TmFtZU1hcC5nZXQocHJvcGVydHlOYW1lKTtcblxuICAgIC8vIFNraXAgdW5yZXNvbHZhYmxlIHJlc291cmNlc1xuICAgIGlmIChjaGlsZFJlc291cmNlPy51bnJlc29sdmFibGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvck1lc3NhZ2UucmVwbGFjZSgne3Byb3BlcnR5TmFtZX0nLCBwcm9wZXJ0eU5hbWUpKTtcbiAgICB9XG5cbiAgICBpZiAoY2hpbGRSZXNvdXJjZSkge1xuICAgICAgY29uc3QgbG9naWNhbE5hbWVGbiA9IGNoaWxkUmVzb3VyY2UubG9naWNhbE5hbWU7XG4gICAgICAvLyBDYWxsIHRoZSBjZkxvZ2ljYWxOYW1lcyBmdW5jdGlvbiB0byBnZXQgdGhlIGFjdHVhbCBDbG91ZEZvcm1hdGlvbiBsb2dpY2FsIG5hbWVcbiAgICAgIC8vIFRyeSB3aXRoIHJlc291cmNlTmFtZSBmaXJzdCAobW9zdCBjb21tb24pLCB0aGVuIHRyeSB3aXRob3V0IGFyZ3VtZW50c1xuICAgICAgbGV0IGxvZ2ljYWxOYW1lOiBzdHJpbmc7XG4gICAgICB0cnkge1xuICAgICAgICBsb2dpY2FsTmFtZSA9IGxvZ2ljYWxOYW1lRm4ocmVzb3VyY2VOYW1lKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGxvZ2ljYWxOYW1lID0gbG9naWNhbE5hbWVGbigpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBJZiBib3RoIGZhaWwsIHVzZSBwcm9wZXJ0eSBuYW1lIGFzLWlzXG4gICAgICAgICAgbG9naWNhbE5hbWUgPSBwcm9wZXJ0eU5hbWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChsb2dpY2FsTmFtZS5pbmNsdWRlcygndW5kZWZpbmVkJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yTWVzc2FnZS5yZXBsYWNlKCd7cHJvcGVydHlOYW1lfScsIHByb3BlcnR5TmFtZSkpO1xuICAgICAgfVxuICAgICAgdHJhbnNmb3JtZWRUcmFuc2Zvcm1zW2xvZ2ljYWxOYW1lXSA9IHRyYW5zZm9ybXNbcHJvcGVydHlOYW1lXTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgbm90IGZvdW5kIGluIG1hcCwgdXNlIHByb3BlcnR5IG5hbWUgYXMtaXMgKHNob3VsZG4ndCBoYXBwZW4gd2l0aCBwcm9wZXIgdHlwZXMpXG4gICAgICB0cmFuc2Zvcm1lZFRyYW5zZm9ybXNbcHJvcGVydHlOYW1lXSA9IHRyYW5zZm9ybXNbcHJvcGVydHlOYW1lXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJhbnNmb3JtZWRUcmFuc2Zvcm1zO1xufVxuXG5leHBvcnQgdHlwZSBHZXRDb25maWdQYXJhbXMgPSB7XG4gIC8qKlxuICAgKiBQcm9qZWN0IG5hbWUgdXNlZCBmb3IgdGhpcyBvcGVyYXRpb25cbiAgICovXG4gIHByb2plY3ROYW1lOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBTdGFnZSAoXCJlbnZpcm9ubWVudFwiKSB1c2VkIGZvciB0aGlzIG9wZXJhdGlvblxuICAgKi9cbiAgc3RhZ2U6IHN0cmluZztcbiAgLyoqXG4gICAqIEFXUyByZWdpb24gdXNlZCBmb3IgdGhpcyBvcGVyYXRpb25cbiAgICogVGhlIGxpc3Qgb2YgYXZhaWxhYmxlIHJlZ2lvbnMgaXMgYXZhaWxhYmxlIGF0IGh0dHBzOi8vd3d3LmF3cy1zZXJ2aWNlcy5pbmZvL3JlZ2lvbnMuaHRtbFxuICAgKi9cbiAgcmVnaW9uOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBMaXN0IG9mIGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIG9wZXJhdGlvblxuICAgKi9cbiAgY2xpQXJnczogU3RhY2t0YXBlQXJncztcbiAgLyoqXG4gICAqIFN0YWNrdGFwZSBjb21tYW5kIHVzZWQgdG8gcGVyZm9ybSB0aGlzIG9wZXJhdGlvbiAoZm9yIGV4YW1wbGUgZGVwbG95LCBkZWxldGUsIGV0Yy4pXG4gICAqL1xuICBjb21tYW5kOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBMb2NhbGx5LWNvbmZpZ3VyZWQgQVdTIHByb2ZpbGUgdXNlZCB0byBleGVjdXRlIHRoZSBvcGVyYXRpb24uXG4gICAqIERvZXNuJ3QgYXBwbHkgaWYgeW91IGhhdmUgeW91ciBBV1MgYWNjb3VudCBjb25uZWN0ZWQgaW4gXCJhdXRvbWF0aWNcIiBtb2RlLlxuICAgKi9cbiAgYXdzUHJvZmlsZTogc3RyaW5nO1xuICAvKipcbiAgICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHVzZXIgcGVyZm9ybWluZyB0aGUgc3RhY2sgb3BlcmF0aW9uXG4gICAqL1xuICB1c2VyOiB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgZW1haWw6IHN0cmluZztcbiAgfTtcbn07XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGRlZmluZSBhIGNvbmZpZyB3aXRoIGF1dG9tYXRpYyB0cmFuc2Zvcm1hdGlvblxuICogVXNlIHRoaXMgd2hlbiBleHBvcnRpbmcgeW91ciBjb25maWcgZm9yIHRoZSBTdGFja3RhcGUgQ0xJXG4gKi9cbmV4cG9ydCBjb25zdCBkZWZpbmVDb25maWcgPSAoY29uZmlnRm46IChwYXJhbXM6IEdldENvbmZpZ1BhcmFtcykgPT4gU3RhY2t0YXBlQ29uZmlnKSA9PiB7XG4gIHJldHVybiAocGFyYW1zOiBHZXRDb25maWdQYXJhbXMpID0+IHtcbiAgICBjb25zdCBjb25maWcgPSBjb25maWdGbihwYXJhbXMpO1xuICAgIHJldHVybiB0cmFuc2Zvcm1Db25maWdXaXRoUmVzb3VyY2VzKGNvbmZpZyk7XG4gIH07XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybXMgYSBjb25maWcgd2l0aCByZXNvdXJjZSBpbnN0YW5jZXMgaW50byBhIHBsYWluIGNvbmZpZyBvYmplY3RcbiAqL1xuZXhwb3J0IGNvbnN0IHRyYW5zZm9ybUNvbmZpZ1dpdGhSZXNvdXJjZXMgPSAoY29uZmlnOiBhbnkpOiBhbnkgPT4ge1xuICBpZiAoIWNvbmZpZyB8fCB0eXBlb2YgY29uZmlnICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICAvLyBGaXJzdCBwYXNzOiBzZXQgYWxsIHJlc291cmNlIG5hbWVzIGZyb20gb2JqZWN0IGtleXNcbiAgLy8gVGhpcyBtdXN0IGhhcHBlbiBiZWZvcmUgYW55IHRyYW5zZm9ybWF0aW9uIHNvIHRoYXQgUmVzb3VyY2VQYXJhbVJlZmVyZW5jZXMgY2FuIHJlc29sdmUgbmFtZXNcbiAgaWYgKGNvbmZpZy5yZXNvdXJjZXMgJiYgdHlwZW9mIGNvbmZpZy5yZXNvdXJjZXMgPT09ICdvYmplY3QnKSB7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gY29uZmlnLnJlc291cmNlcykge1xuICAgICAgY29uc3QgcmVzb3VyY2UgPSBjb25maWcucmVzb3VyY2VzW2tleV07XG4gICAgICBpZiAoaXNCYXNlUmVzb3VyY2UocmVzb3VyY2UpKSB7XG4gICAgICAgIChyZXNvdXJjZSBhcyBhbnkpW3NldFJlc291cmNlTmFtZVN5bWJvbF0oa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBTZWNvbmQgcGFzczogdHJhbnNmb3JtIHRoZSBjb25maWdcbiAgY29uc3QgcmVzdWx0OiBhbnkgPSB7fTtcbiAgZm9yIChjb25zdCBrZXkgaW4gY29uZmlnKSB7XG4gICAgaWYgKGtleSA9PT0gJ3Jlc291cmNlcycpIHtcbiAgICAgIC8vIFJlc291cmNlcyBhcmUgdHJhbnNmb3JtZWQgYXMgZGVmaW5pdGlvbnNcbiAgICAgIHJlc3VsdFtrZXldID0gdHJhbnNmb3JtUmVzb3VyY2VEZWZpbml0aW9ucyhjb25maWdba2V5XSk7XG4gICAgfSBlbHNlIGlmIChrZXkgPT09ICdzY3JpcHRzJykge1xuICAgICAgLy8gU2NyaXB0cyBhcmUgYWxzbyB0cmFuc2Zvcm1lZCBhcyBkZWZpbml0aW9uc1xuICAgICAgcmVzdWx0W2tleV0gPSB0cmFuc2Zvcm1TY3JpcHREZWZpbml0aW9ucyhjb25maWdba2V5XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdFtrZXldID0gdHJhbnNmb3JtVmFsdWUoY29uZmlnW2tleV0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm1zIGVudmlyb25tZW50IG9iamVjdCB0byBhcnJheSBmb3JtYXRcbiAqL1xuY29uc3QgdHJhbnNmb3JtRW52aXJvbm1lbnQgPSAoZW52OiBhbnkpOiBhbnkgPT4ge1xuICBpZiAoIWVudiB8fCB0eXBlb2YgZW52ICE9PSAnb2JqZWN0JyB8fCBBcnJheS5pc0FycmF5KGVudikpIHtcbiAgICByZXR1cm4gZW52O1xuICB9XG5cbiAgLy8gQ29udmVydCB7IEtFWTogdmFsdWUgfSB0byBbeyBuYW1lOiAnS0VZJywgdmFsdWUgfV1cbiAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKGVudikubWFwKChbbmFtZSwgdmFsdWVdKSA9PiAoe1xuICAgIG5hbWUsXG4gICAgdmFsdWU6IHRyYW5zZm9ybVZhbHVlKHZhbHVlKVxuICB9KSk7XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybXMgcmVzb3VyY2UgZGVmaW5pdGlvbnMgKHZhbHVlcyBpbiB0aGUgcmVzb3VyY2VzIG9iamVjdClcbiAqL1xuY29uc3QgdHJhbnNmb3JtUmVzb3VyY2VEZWZpbml0aW9ucyA9IChyZXNvdXJjZXM6IGFueSk6IGFueSA9PiB7XG4gIGlmICghcmVzb3VyY2VzIHx8IHR5cGVvZiByZXNvdXJjZXMgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIHJlc291cmNlcztcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdDogYW55ID0ge307XG4gIGZvciAoY29uc3Qga2V5IGluIHJlc291cmNlcykge1xuICAgIGNvbnN0IHJlc291cmNlID0gcmVzb3VyY2VzW2tleV07XG4gICAgaWYgKGlzQmFzZVJlc291cmNlKHJlc291cmNlKSkge1xuICAgICAgY29uc3QgdHlwZSA9IChyZXNvdXJjZSBhcyBhbnkpW2dldFR5cGVTeW1ib2xdKCk7XG4gICAgICBjb25zdCBwcm9wZXJ0aWVzID0gKHJlc291cmNlIGFzIGFueSlbZ2V0UHJvcGVydGllc1N5bWJvbF0oKTtcbiAgICAgIGNvbnN0IG92ZXJyaWRlcyA9IChyZXNvdXJjZSBhcyBhbnkpW2dldE92ZXJyaWRlc1N5bWJvbF0oKTtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybXMgPSAocmVzb3VyY2UgYXMgYW55KVtnZXRUcmFuc2Zvcm1zU3ltYm9sXSgpO1xuICAgICAgcmVzdWx0W2tleV0gPSB7XG4gICAgICAgIHR5cGUsXG4gICAgICAgIHByb3BlcnRpZXM6IHRyYW5zZm9ybVZhbHVlKHByb3BlcnRpZXMpLFxuICAgICAgICAuLi4ob3ZlcnJpZGVzICE9PSB1bmRlZmluZWQgJiYgeyBvdmVycmlkZXM6IHRyYW5zZm9ybVZhbHVlKG92ZXJyaWRlcykgfSksXG4gICAgICAgIC4uLih0cmFuc2Zvcm1zICE9PSB1bmRlZmluZWQgJiYgeyB0cmFuc2Zvcm1zIH0pXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHRba2V5XSA9IHRyYW5zZm9ybVZhbHVlKHJlc291cmNlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtcyBzY3JpcHQgZGVmaW5pdGlvbnMgKHZhbHVlcyBpbiB0aGUgc2NyaXB0cyBvYmplY3QpXG4gKi9cbmNvbnN0IHRyYW5zZm9ybVNjcmlwdERlZmluaXRpb25zID0gKHNjcmlwdHM6IGFueSk6IGFueSA9PiB7XG4gIGlmICghc2NyaXB0cyB8fCB0eXBlb2Ygc2NyaXB0cyAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gc2NyaXB0cztcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdDogYW55ID0ge307XG4gIGZvciAoY29uc3Qga2V5IGluIHNjcmlwdHMpIHtcbiAgICBjb25zdCBzY3JpcHQgPSBzY3JpcHRzW2tleV07XG4gICAgaWYgKGlzQmFzZVR5cGVQcm9wZXJ0aWVzKHNjcmlwdCkpIHtcbiAgICAgIHJlc3VsdFtrZXldID0ge1xuICAgICAgICB0eXBlOiBzY3JpcHQudHlwZSxcbiAgICAgICAgcHJvcGVydGllczogdHJhbnNmb3JtVmFsdWUoc2NyaXB0LnByb3BlcnRpZXMpXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHRba2V5XSA9IHRyYW5zZm9ybVZhbHVlKHNjcmlwdCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5leHBvcnQgY29uc3QgdHJhbnNmb3JtVmFsdWUgPSAodmFsdWU6IGFueSk6IGFueSA9PiB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25zdCByZXdyaXR0ZW5EaXJlY3RpdmUgPSByZXdyaXRlRW1iZWRkZWREaXJlY3RpdmVzVG9DZkZvcm1hdCh2YWx1ZSk7XG4gICAgaWYgKHJld3JpdHRlbkRpcmVjdGl2ZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHJld3JpdHRlbkRpcmVjdGl2ZTtcbiAgICB9XG4gIH1cblxuICAvLyBUcmFuc2Zvcm0gRGVmZXJyZWRSZXNvdXJjZU5hbWUgLSByZXNvbHZlIHRvIGFjdHVhbCBuYW1lXG4gIGlmIChpc0RlZmVycmVkUmVzb3VyY2VOYW1lKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS5yZXNvbHZlKCk7XG4gIH1cblxuICAvLyBUcmFuc2Zvcm0gUmVzb3VyY2VQYXJhbVJlZmVyZW5jZVxuICBpZiAoaXNSZXNvdXJjZVBhcmFtUmVmZXJlbmNlKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICB9XG5cbiAgLy8gVHJhbnNmb3JtIEJhc2VSZXNvdXJjZSByZWZlcmVuY2VzIChub3QgZGVmaW5pdGlvbnMpIHRvIHJlc291cmNlTmFtZVxuICAvLyBUaGlzIGhhbmRsZXMgY2FzZXMgbGlrZSBjb25uZWN0VG86IFtkYXRhYmFzZV1cbiAgaWYgKGlzQmFzZVJlc291cmNlKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS5yZXNvdXJjZU5hbWU7XG4gIH1cblxuICAvLyBUcmFuc2Zvcm0gQmFzZVR5cGVQcm9wZXJ0aWVzIChlbmdpbmVzLCBwYWNrYWdpbmcsIGV2ZW50cykgdG8gcGxhaW4gb2JqZWN0XG4gIGlmIChpc0Jhc2VUeXBlUHJvcGVydGllcyh2YWx1ZSkpIHtcbiAgICAvLyBIYW5kbGUgdHlwZS1vbmx5IGNsYXNzZXMgKG5vIHByb3BlcnRpZXMpXG4gICAgaWYgKCEoJ3Byb3BlcnRpZXMnIGluIHZhbHVlKSB8fCB2YWx1ZS5wcm9wZXJ0aWVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7IHR5cGU6IHZhbHVlLnR5cGUgfTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6IHZhbHVlLnR5cGUsXG4gICAgICBwcm9wZXJ0aWVzOiB0cmFuc2Zvcm1WYWx1ZSh2YWx1ZS5wcm9wZXJ0aWVzKVxuICAgIH07XG4gIH1cblxuICAvLyBUcmFuc2Zvcm0gQWxhcm0gY2xhc3MgdG8gcGxhaW4gb2JqZWN0XG4gIGlmIChpc0FsYXJtKHZhbHVlKSkge1xuICAgIGNvbnN0IHJlc3VsdDogYW55ID0ge1xuICAgICAgdHJpZ2dlcjogdHJhbnNmb3JtVmFsdWUodmFsdWUudHJpZ2dlcilcbiAgICB9O1xuICAgIGlmICh2YWx1ZS5ldmFsdWF0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlc3VsdC5ldmFsdWF0aW9uID0gdHJhbnNmb3JtVmFsdWUodmFsdWUuZXZhbHVhdGlvbik7XG4gICAgfVxuICAgIGlmICh2YWx1ZS5ub3RpZmljYXRpb25UYXJnZXRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlc3VsdC5ub3RpZmljYXRpb25UYXJnZXRzID0gdHJhbnNmb3JtVmFsdWUodmFsdWUubm90aWZpY2F0aW9uVGFyZ2V0cyk7XG4gICAgfVxuICAgIGlmICh2YWx1ZS5kZXNjcmlwdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXN1bHQuZGVzY3JpcHRpb24gPSB2YWx1ZS5kZXNjcmlwdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIFRyYW5zZm9ybSBhcnJheXNcbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgLy8gSWYgaXQncyBhIHJlc291cmNlIGluc3RhbmNlIGluIGFuIGFycmF5IChlLmcuLCBjb25uZWN0VG8pLCB0cmFuc2Zvcm0gdG8gcmVzb3VyY2VOYW1lXG4gICAgICBpZiAoaXNCYXNlUmVzb3VyY2UoaXRlbSkpIHtcbiAgICAgICAgcmV0dXJuIGl0ZW0ucmVzb3VyY2VOYW1lO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRyYW5zZm9ybVZhbHVlKGl0ZW0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gVHJhbnNmb3JtIG9iamVjdHNcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICBjb25zdCByZXN1bHQ6IGFueSA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IGluIHZhbHVlKSB7XG4gICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBlbnZpcm9ubWVudCBhbmQgaW5qZWN0RW52aXJvbm1lbnQgcHJvcGVydGllc1xuICAgICAgaWYgKGtleSA9PT0gJ2Vudmlyb25tZW50JyB8fCBrZXkgPT09ICdpbmplY3RFbnZpcm9ubWVudCcpIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB0cmFuc2Zvcm1FbnZpcm9ubWVudCh2YWx1ZVtrZXldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdHJhbnNmb3JtVmFsdWUodmFsdWVba2V5XSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59O1xuXG5jb25zdCBSVU5USU1FX0RJUkVDVElWRV9OQU1FUyA9IG5ldyBTZXQoWydSZXNvdXJjZVBhcmFtJywgJ0NmUmVzb3VyY2VQYXJhbScsICdTZWNyZXQnLCAnQ2ZGb3JtYXQnLCAnQ2ZTdGFja091dHB1dCddKTtcblxuY29uc3QgcmV3cml0ZUVtYmVkZGVkRGlyZWN0aXZlc1RvQ2ZGb3JtYXQgPSAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwgPT4ge1xuICBjb25zdCBlbWJlZGRlZERpcmVjdGl2ZXMgPSBnZXRFbWJlZGRlZERpcmVjdGl2ZXModmFsdWUpO1xuICBpZiAoZW1iZWRkZWREaXJlY3RpdmVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgaWYgKFxuICAgIGVtYmVkZGVkRGlyZWN0aXZlcy5sZW5ndGggPT09IDEgJiZcbiAgICBlbWJlZGRlZERpcmVjdGl2ZXNbMF0uc3RhcnRQb3MgPT09IDAgJiZcbiAgICBlbWJlZGRlZERpcmVjdGl2ZXNbMF0uZW5kUG9zID09PSB2YWx1ZS5sZW5ndGhcbiAgKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBsZXQgaW50ZXJwb2xhdGVkU3RyaW5nID0gJyc7XG4gIGxldCBjdXJyZW50UG9zID0gMDtcbiAgZW1iZWRkZWREaXJlY3RpdmVzLmZvckVhY2goKHsgc3RhcnRQb3MsIGVuZFBvcyB9KSA9PiB7XG4gICAgaW50ZXJwb2xhdGVkU3RyaW5nICs9IGAke3ZhbHVlLnNsaWNlKGN1cnJlbnRQb3MsIHN0YXJ0UG9zKX17fWA7XG4gICAgY3VycmVudFBvcyA9IGVuZFBvcztcbiAgfSk7XG4gIGludGVycG9sYXRlZFN0cmluZyArPSB2YWx1ZS5zbGljZShjdXJyZW50UG9zKTtcblxuICBjb25zdCBlc2NhcGVkSW50ZXJwb2xhdGVkU3RyaW5nID0gaW50ZXJwb2xhdGVkU3RyaW5nXG4gICAgLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJylcbiAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKVxuICAgIC5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJylcbiAgICAucmVwbGFjZSgvXFx0L2csICdcXFxcdCcpO1xuXG4gIGNvbnN0IGRpcmVjdGl2ZUFyZ3MgPSBlbWJlZGRlZERpcmVjdGl2ZXMubWFwKCh7IGRlZmluaXRpb24gfSkgPT4gZGVmaW5pdGlvbikuam9pbignLCAnKTtcbiAgY29uc3QgaGFzUnVudGltZURpcmVjdGl2ZSA9IGVtYmVkZGVkRGlyZWN0aXZlcy5zb21lKCh7IG5hbWUgfSkgPT4gUlVOVElNRV9ESVJFQ1RJVkVfTkFNRVMuaGFzKG5hbWUpKTtcbiAgY29uc3QgZm9ybWF0RGlyZWN0aXZlTmFtZSA9IGhhc1J1bnRpbWVEaXJlY3RpdmUgPyAnQ2ZGb3JtYXQnIDogJ0Zvcm1hdCc7XG4gIHJldHVybiBgJCR7Zm9ybWF0RGlyZWN0aXZlTmFtZX0oJyR7ZXNjYXBlZEludGVycG9sYXRlZFN0cmluZ30nLCAke2RpcmVjdGl2ZUFyZ3N9KWA7XG59O1xuXG5jb25zdCBnZXRFbWJlZGRlZERpcmVjdGl2ZXMgPSAoXG4gIHZhbHVlOiBzdHJpbmdcbik6IEFycmF5PHsgZGVmaW5pdGlvbjogc3RyaW5nOyBuYW1lOiBzdHJpbmc7IHN0YXJ0UG9zOiBudW1iZXI7IGVuZFBvczogbnVtYmVyIH0+ID0+IHtcbiAgY29uc3QgZGlyZWN0aXZlczogQXJyYXk8eyBkZWZpbml0aW9uOiBzdHJpbmc7IG5hbWU6IHN0cmluZzsgc3RhcnRQb3M6IG51bWJlcjsgZW5kUG9zOiBudW1iZXIgfT4gPSBbXTtcblxuICBjb25zdCB0cnlQYXJzZURpcmVjdGl2ZUF0ID0gKFxuICAgIHN0cjogc3RyaW5nLFxuICAgIHN0YXJ0UG9zOiBudW1iZXJcbiAgKTogeyBkZWZpbml0aW9uOiBzdHJpbmc7IG5hbWU6IHN0cmluZzsgZW5kUG9zOiBudW1iZXIgfSB8IG51bGwgPT4ge1xuICAgIGlmIChzdHJbc3RhcnRQb3NdICE9PSAnJCcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGxldCBpZHggPSBzdGFydFBvcyArIDE7XG4gICAgY29uc3QgZmlyc3ROYW1lQ2hhciA9IHN0cltpZHhdO1xuICAgIGlmICghZmlyc3ROYW1lQ2hhciB8fCAhZmlyc3ROYW1lQ2hhci5tYXRjaCgvW0EtWl9dL2kpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB3aGlsZSAoaWR4IDwgc3RyLmxlbmd0aCAmJiBzdHJbaWR4XS5tYXRjaCgvW1xcdyRdLykpIHtcbiAgICAgIGlkeCsrO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWUgPSBzdHIuc2xpY2Uoc3RhcnRQb3MgKyAxLCBpZHgpO1xuXG4gICAgaWYgKHN0cltpZHhdICE9PSAnKCcpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGxldCBkZXB0aCA9IDA7XG4gICAgbGV0IGluU2luZ2xlUXVvdGUgPSBmYWxzZTtcbiAgICBsZXQgaW5Eb3VibGVRdW90ZSA9IGZhbHNlO1xuICAgIGxldCBjbG9zaW5nUGFyZW5Qb3MgPSAtMTtcblxuICAgIGZvciAobGV0IGkgPSBpZHg7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGNoYXIgPSBzdHJbaV07XG4gICAgICBjb25zdCBwcmV2Q2hhciA9IGkgPiAwID8gc3RyW2kgLSAxXSA6ICcnO1xuXG4gICAgICBpZiAoY2hhciA9PT0gXCInXCIgJiYgcHJldkNoYXIgIT09ICdcXFxcJyAmJiAhaW5Eb3VibGVRdW90ZSkge1xuICAgICAgICBpblNpbmdsZVF1b3RlID0gIWluU2luZ2xlUXVvdGU7XG4gICAgICB9IGVsc2UgaWYgKGNoYXIgPT09ICdcIicgJiYgcHJldkNoYXIgIT09ICdcXFxcJyAmJiAhaW5TaW5nbGVRdW90ZSkge1xuICAgICAgICBpbkRvdWJsZVF1b3RlID0gIWluRG91YmxlUXVvdGU7XG4gICAgICB9XG5cbiAgICAgIGlmICghaW5TaW5nbGVRdW90ZSAmJiAhaW5Eb3VibGVRdW90ZSkge1xuICAgICAgICBpZiAoY2hhciA9PT0gJygnKSB7XG4gICAgICAgICAgZGVwdGgrKztcbiAgICAgICAgfSBlbHNlIGlmIChjaGFyID09PSAnKScpIHtcbiAgICAgICAgICBkZXB0aC0tO1xuICAgICAgICAgIGlmIChkZXB0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2xvc2luZ1BhcmVuUG9zID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjbG9zaW5nUGFyZW5Qb3MgPT09IC0xKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgZW5kUG9zID0gY2xvc2luZ1BhcmVuUG9zICsgMTtcbiAgICBpZiAoc3RyW2VuZFBvc10gPT09ICcuJykge1xuICAgICAgZW5kUG9zKys7XG4gICAgICB3aGlsZSAoZW5kUG9zIDwgc3RyLmxlbmd0aCAmJiBzdHJbZW5kUG9zXS5tYXRjaCgvW1xcdyRcXC5dLykpIHtcbiAgICAgICAgZW5kUG9zKys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGRlZmluaXRpb246IHN0ci5zbGljZShzdGFydFBvcywgZW5kUG9zKSxcbiAgICAgIG5hbWUsXG4gICAgICBlbmRQb3NcbiAgICB9O1xuICB9O1xuXG4gIGxldCBpZHggPSAwO1xuICB3aGlsZSAoaWR4IDwgdmFsdWUubGVuZ3RoKSB7XG4gICAgaWYgKHZhbHVlW2lkeF0gPT09ICckJykge1xuICAgICAgY29uc3QgcGFyc2VkID0gdHJ5UGFyc2VEaXJlY3RpdmVBdCh2YWx1ZSwgaWR4KTtcbiAgICAgIGlmIChwYXJzZWQpIHtcbiAgICAgICAgZGlyZWN0aXZlcy5wdXNoKHsgZGVmaW5pdGlvbjogcGFyc2VkLmRlZmluaXRpb24sIG5hbWU6IHBhcnNlZC5uYW1lLCBzdGFydFBvczogaWR4LCBlbmRQb3M6IHBhcnNlZC5lbmRQb3MgfSk7XG4gICAgICAgIGlkeCA9IHBhcnNlZC5lbmRQb3M7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZHgrKztcbiAgfVxuXG4gIHJldHVybiBkaXJlY3RpdmVzO1xufTtcbiIsCiAgICAiLyoqXG4gKiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIGEgcmVzb3VyY2UgcGFyYW1ldGVyLlxuICogQHBhcmFtIHJlc291cmNlTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSByZXNvdXJjZSBhcyBzcGVjaWZpZWQgaW4gdGhlIFN0YWNrdGFwZSBjb25maWcuXG4gKiBAcGFyYW0gcHJvcGVydHkgLSBUaGUgcHJvcGVydHkgb2YgdGhlIHJlc291cmNlLiBUaGUgbGlzdCBvZiBwcm9wZXJ0aWVzIGlzIGF2YWlsYWJsZSBpbiB0aGUgU3RhY2t0YXBlIGRvY3MgZm9yIGV2ZXJ5IGdpdmVuIHJlc291cmNlIHR5cGUuXG4gKi9cbmV4cG9ydCBjb25zdCAkUmVzb3VyY2VQYXJhbSA9IChyZXNvdXJjZU5hbWU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZykgPT4ge1xuICByZXR1cm4gYCRSZXNvdXJjZVBhcmFtKCcke3Jlc291cmNlTmFtZX0nLCcke3Byb3BlcnR5fScpYDtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIHJlZmVyZW5jZSB0byBhIENsb3VkRm9ybWF0aW9uIHJlc291cmNlIHBhcmFtZXRlci5cbiAqIEBwYXJhbSBjbG91ZGZvcm1hdGlvblJlc291cmNlTG9naWNhbElkIC0gVGhlIGxvZ2ljYWwgbmFtZSBvZiB0aGUgQ2xvdWRmb3JtYXRpb24gcmVzb3VyY2UuXG4gKiBJZiB5b3UgYXJlIHJlZmVyZW5jaW5nIGEgcmVzb3VyY2UgZGVmaW5lZCBpbiB0aGUgY2xvdWRmb3JtYXRpb25SZXNvdXJjZXMgc2VjdGlvbiwgdXNlIGl0cyBuYW1lLlxuICogVG8gcmVmZXJlbmNlIGEgY2hpbGQgcmVzb3VyY2Ugb2YgYSBTdGFja3RhcGUgcmVzb3VyY2UsIHlvdSBjYW4gZ2V0IGEgbGlzdCBvZiBjaGlsZCByZXNvdXJjZXMgd2l0aCB0aGUgYHN0YWNrdGFwZSBzdGFjay1pbmZvYCBjb21tYW5kXG4gKiBAcGFyYW0gcHJvcGVydHkgLSBUaGUgcGFyYW1ldGVyIG9mIHRoZSBDbG91ZGZvcm1hdGlvbiByZXNvdXJjZSB0byByZWZlcmVuY2UuXG4gKiBGb3IgYSBsaXN0IG9mIGFsbCByZWZlcmVuY2VhYmxlIHBhcmFtZXRlcnMsIHJlZmVyIHRvIHRoZSBbUmVmZXJlbmNpbmcgcGFyYW1ldGVyc10oaHR0cHM6Ly9kb2NzLnN0YWNrdGFwZS5jb20vY29uZmlndXJhdGlvbi9yZWZlcmVuY2luZy1wYXJhbWV0ZXJzI3BhcmFtZXRlcnMtb2YtY2xvdWRmb3JtYXRpb24tcmVzb3VyY2VzKSBzZWN0aW9uIGluIHRoZSBTdGFja3RhcGUgZG9jcy5cbiAqL1xuZXhwb3J0IGNvbnN0ICRDZlJlc291cmNlUGFyYW0gPSAoY2xvdWRmb3JtYXRpb25SZXNvdXJjZUxvZ2ljYWxJZDogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nKSA9PiB7XG4gIHJldHVybiBgJENmUmVzb3VyY2VQYXJhbSgnJHtjbG91ZGZvcm1hdGlvblJlc291cmNlTG9naWNhbElkfScsJyR7cHJvcGVydHl9JylgO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIGEgc2VjcmV0LlxuICogQHBhcmFtIHNlY3JldE5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgc2VjcmV0LiBNdXN0IGJlIGEgdmFsaWQgc2VjcmV0IG5hbWUgaW4gdGhlIEFXUyBTZWNyZXRzIE1hbmFnZXIgaW4gdGhlIHJlZ2lvbiB5b3UncmUgZGVwbG95aW5nIHRvLlxuICogSWYgdGhlIHNlY3JldCBpcyBpbiBKU09OIGZvcm1hdCwgeW91IGNhbiBleHRyYWN0IG5lc3RlZCBwcm9wZXJ0aWVzIHVzaW5nIGRvdCBub3RhdGlvbi5cbiAqIEV4YW1wbGU6IGAkU2VjcmV0KCdteS1zZWNyZXQuYXBpLWtleScpYCB3aWxsIHJldHVybiB0aGUgdmFsdWUgb2YgdGhlIGBhcGkta2V5YCBwcm9wZXJ0eSBpbiB0aGUgYG15LXNlY3JldGAgc2VjcmV0LlxuICovXG5leHBvcnQgY29uc3QgJFNlY3JldCA9IChzZWNyZXROYW1lOiBzdHJpbmcpID0+IHtcbiAgcmV0dXJuIGAkU2VjcmV0KCcke3NlY3JldE5hbWV9JylgO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIGFuIFNTTSBQYXJhbWV0ZXIgU3RvcmUgcGFyYW1ldGVyLlxuICogQHBhcmFtIHBhcmFtTmFtZSAtIFRoZSBuYW1lIChvciBwYXRoKSBvZiB0aGUgU1NNIHBhcmFtZXRlci4gTXVzdCBleGlzdCBpbiB0aGUgQVdTIFN5c3RlbXMgTWFuYWdlciBQYXJhbWV0ZXIgU3RvcmUgaW4gdGhlIHJlZ2lvbiB5b3UncmUgZGVwbG95aW5nIHRvLlxuICogU3VwcG9ydHMgYm90aCBgU3RyaW5nYCBhbmQgYFNlY3VyZVN0cmluZ2AgcGFyYW1ldGVyIHR5cGVzIChhdXRvLWRldGVjdGVkKS5cbiAqIEV4YW1wbGU6IGAkU3NtUGFyYW0oJ215LWFwaS1rZXknKWAgb3IgYCRTc21QYXJhbSgnL3Byb2QvZGF0YWJhc2UvaG9zdCcpYFxuICovXG5leHBvcnQgY29uc3QgJFNzbVBhcmFtID0gKHBhcmFtTmFtZTogc3RyaW5nKSA9PiB7XG4gIHJldHVybiBgJFNzbVBhcmFtKCcke3BhcmFtTmFtZX0nKWA7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gaW50ZXJwb2xhdGVkIHN0cmluZy4gVW5saWtlIHRoZSAkRm9ybWF0KCkgZGlyZWN0aXZlLCB0aGUgJENmRm9ybWF0KCkgZGlyZWN0aXZlIGNhbiBjb250YWluIHJ1bnRpbWUtcmVzb2x2ZWQgZGlyZWN0aXZlcyBhcyBhcmd1bWVudHMuXG4gKiBAcGFyYW0gaW50ZXJwb2xhdGVkU3RyaW5nIC0gT2NjdXJyZW5jZXMgb2Yge30gYXJlIHJlcGxhY2VkIGJ5IHRoZSBzdWJzZXF1ZW50IGFyZ3VtZW50cy5cbiAqIEBwYXJhbSB2YWx1ZXMgLSBUaGUgbnVtYmVyIG9mIHZhbHVlcyBtdXN0IGJlIGVxdWFsIHRvIHRoZSBudW1iZXIgb2Yge30gcGxhY2Vob2xkZXJzIGluIHRoZSBmaXJzdCBhcmd1bWVudC5cbiAqIEV4YW1wbGU6XG4gKiBgJENmRm9ybWF0KCd7fS17fScsICdmb28nLCAnYmFyJylgIHJlc3VsdHMgaW4gYGZvby1iYXJgLlxuICogJENmRm9ybWF0KCd7fS1teWRvbWFpbi5jb20nLCAnZm9vJykgcmVzdWx0cyBpbiBmb28tbXlkb21haW4uY29tLlxuICogYCRDZkZvcm1hdCgne30ubXlkb21haW4uY29tJywgJFN0YWdlKCkpYCByZXN1bHRzIGluIGBzdGFnaW5nLm15ZG9tYWluLmNvbWAgaWYgdGhlIHN0YWdlIGlzIHN0YWdpbmcuXG4gKi9cbmV4cG9ydCBjb25zdCAkQ2ZGb3JtYXQgPSAoaW50ZXJwb2xhdGVkU3RyaW5nOiBzdHJpbmcsIC4uLnZhbHVlczogYW55W10pID0+IHtcbiAgcmV0dXJuIGAkQ2ZGb3JtYXQoJyR7aW50ZXJwb2xhdGVkU3RyaW5nfScsICcke3ZhbHVlcy5qb2luKCcsJyl9JylgO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBvdXRwdXQgb2YgYW5vdGhlciBzdGFjaywgYWxsb3dpbmcgeW91IHRvIHJlZmVyZW5jZSByZXNvdXJjZXMgZGVwbG95ZWQgaW4gYW5vdGhlciBzdGFjay4gVGhlIHJlZmVyZW5jZWQgc3RhY2sgbXVzdCBhbHJlYWR5IGJlIGRlcGxveWVkLiBJZiB5b3UgdHJ5IHRvIGRlbGV0ZSBhIHN0YWNrIHRoYXQgaXMgcmVmZXJlbmNlZCBieSBhbm90aGVyIHN0YWNrLCB5b3Ugd2lsbCBnZXQgYW4gZXJyb3IuXG4gKiBUbyBnZXQgdGhlIG91dHB1dCBsb2NhbGx5IChpLmUuLCBkb3dubG9hZCB0aGUgdmFsdWUgYW5kIHBhc3MgaXQgdG8gdGhlIGNvbmZpZ3VyYXRpb24pLCB1c2UgdGhlICRTdGFja091dHB1dCgpIGRpcmVjdGl2ZS5cbiAqIEBwYXJhbSBzdGFja05hbWUgLSBUaGUgbmFtZSBvZiB0aGUgc3RhY2suXG4gKiBAcGFyYW0gb3V0cHV0TmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBvdXRwdXQuXG4gKi9cbmV4cG9ydCBjb25zdCAkQ2ZTdGFja091dHB1dCA9IChzdGFja05hbWU6IHN0cmluZywgb3V0cHV0TmFtZTogc3RyaW5nKSA9PiB7XG4gIHJldHVybiBgJENmU3RhY2tPdXRwdXQoJyR7c3RhY2tOYW1lfScsJyR7b3V0cHV0TmFtZX0nKWA7XG59O1xuXG4vKipcbiAqIFJldHVybnMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnQgR2l0IHJlcG9zaXRvcnkuXG4gKiBAcGFyYW0gcHJvcGVydHkgLSBXaGljaCBwaWVjZSBvZiBHaXQgaW5mb3JtYXRpb24gdG8gcmV0dXJuLiBPbmUgb2Y6XG4gKlxuICogYCRHaXRJbmZvKCdzaGExJylgIC0gU0hBLTEgb2YgdGhlIGxhdGVzdCBjb21taXRcbiAqXG4gKiBgJEdpdEluZm8oJ2NvbW1pdCcpYCAtIFRoZSBsYXRlc3QgY29tbWl0IElEXG4gKlxuICogYCRHaXRJbmZvKCdicmFuY2gnKWAgLSBUaGUgbmFtZSBvZiB0aGUgY3VycmVudCBicmFuY2hcbiAqXG4gKiBgJEdpdEluZm8oJ21lc3NhZ2UnKWAgLSBUaGUgbWVzc2FnZSBvZiB0aGUgbGFzdCBjb21taXRcbiAqXG4gKiBgJEdpdEluZm8oJ3VzZXInKWAgLSBHaXQgdXNlcidzIG5hbWVcbiAqXG4gKiBgJEdpdEluZm8oJ2VtYWlsJylgIC0gR2l0IHVzZXIncyBlbWFpbFxuICpcbiAqIGAkR2l0SW5mbygncmVwb3NpdG9yeScpYCAtIFRoZSBuYW1lIG9mIHRoZSBnaXQgcmVwb3NpdG9yeVxuICpcbiAqIGAkR2l0SW5mbygndGFncycpYCAtIFRoZSB0YWdzIHBvaW50aW5nIHRvIHRoZSBjdXJyZW50IGNvbW1pdFxuICpcbiAqIGAkR2l0SW5mbygnZGVzY3JpYmUnKWAgLSBUaGUgbW9zdCByZWNlbnQgdGFnIHRoYXQgaXMgcmVhY2hhYmxlIGZyb20gYSBjb21taXRcbiAqL1xuZXhwb3J0IGNvbnN0ICRHaXRJbmZvID0gKHByb3BlcnR5OiBzdHJpbmcpID0+IHtcbiAgcmV0dXJuIGAkR2l0SW5mbygnJHtwcm9wZXJ0eX0nKWA7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGN1cnJlbnQgQVdTIHJlZ2lvbiB3aGVyZSB0aGUgc3RhY2sgaXMgYmVpbmcgZGVwbG95ZWQuXG4gKiBFeGFtcGxlOiBgdXMtZWFzdC0xYFxuICovXG5leHBvcnQgY29uc3QgJFJlZ2lvbiA9ICgpID0+IHtcbiAgcmV0dXJuICckUmVnaW9uKCknO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjdXJyZW50IHN0YWdlIG5hbWUuXG4gKiBFeGFtcGxlOiBgcHJvZHVjdGlvbmAsIGBzdGFnaW5nYCwgYGRldmBcbiAqL1xuZXhwb3J0IGNvbnN0ICRTdGFnZSA9ICgpID0+IHtcbiAgcmV0dXJuICckU3RhZ2UoKSc7XG59O1xuIiwKICAgICIvKipcbiAqIEFXUyBTRVMgKFNpbXBsZSBFbWFpbCBTZXJ2aWNlKSByZWZlcmVuY2UgZm9yIGNvbm5lY3RUb1xuICogR3JhbnRzIGZ1bGwgcGVybWlzc2lvbnMgZm9yIEFXUyBTRVMgKHNlczoqKVxuICovXG5leHBvcnQgY29uc3QgQVdTX1NFUyA9ICdhd3M6c2VzJyBhcyBjb25zdDtcblxuLyoqXG4gKiBUeXBlIHRoYXQgcmVwcmVzZW50cyBhbnkgQVdTIHNlcnZpY2UgY29uc3RhbnRcbiAqL1xuZXhwb3J0IHR5cGUgR2xvYmFsQXdzU2VydmljZUNvbnN0YW50ID0gdHlwZW9mIEFXU19TRVM7XG4iLAogICAgIi8qKlxuICogVGhpcyBmaWxlIGRlZmluZXMgdHlwZS1wcm9wZXJ0aWVzIHNoYXBlZCBkZWZpbml0aW9ucyAoZS5nLiBTdGFja3RhcGUgcmVzb3VyY2VzLCBwYWNrYWdpbmcgdHlwZXMgZXRjLilcbiAqIHRoYXQgY2FuIGJlIGNvbnZlcnRlZCB0byBhIFR5cGVzY3JpcHQgY2xhc3MuIFRoZXNlIGNsYXNzZXMgYXJlIHRoZW4gZXhwb3J0ZWQgZnJvbSBzdGFja3RhcGUvY2xhc3Nlc1xuICpcbiAqIEBleGFtcGxlIGltcG9ydCB7IFN0YWNrdGFwZUxhbWJkYUJ1aWxkcGFja1BhY2thZ2luZyB9IGZyb20gJ3N0YWNrdGFwZS9jbGFzc2VzJztcbiAqL1xuXG5leHBvcnQgdHlwZSBSZXNvdXJjZUNsYXNzTmFtZSA9XG4gIHwgS2ViYWJUb1Bhc2NhbENhc2U8U3RwUmVzb3VyY2VUeXBlPlxuICB8ICdGdW5jdGlvbidcbiAgfCAnU2NyaXB0J1xuICB8ICdMYW1iZGFGdW5jdGlvbidcbiAgfCAnU3ZlbHRlS2l0V2ViJ1xuICB8ICdTb2xpZFN0YXJ0V2ViJ1xuICB8ICdUYW5TdGFja1dlYidcbiAgfCAnQWdlbnRDb3JlUnVudGltZSdcbiAgfCAnQWdlbnRDb3JlTWVtb3J5J1xuICB8ICdBZ2VudENvcmVHYXRld2F5J1xuICB8ICdBZ2VudENvcmVCcm93c2VyJ1xuICB8ICdBZ2VudENvcmVDb2RlSW50ZXJwcmV0ZXInO1xuXG5leHBvcnQgdHlwZSBSZXNvdXJjZURlZmluaXRpb24gPSB7XG4gIC8qKiBDbGFzcyBuYW1lIGZvciB0aGUgcmVzb3VyY2UgKGUuZy4sICdMYW1iZGFGdW5jdGlvbicpICovXG4gIGNsYXNzTmFtZTogUmVzb3VyY2VDbGFzc05hbWU7XG4gIC8qKiBSZXNvdXJjZSB0eXBlIGlkZW50aWZpZXIgdXNlZCBpbiBjb25maWcgKGUuZy4sICdmdW5jdGlvbicpICovXG4gIHJlc291cmNlVHlwZTogc3RyaW5nO1xuICAvKiogUHJvcHMgdHlwZSBuYW1lIChlLmcuLCAnTGFtYmRhRnVuY3Rpb25Qcm9wcycpICovXG4gIHByb3BzVHlwZTogc3RyaW5nO1xuICAvKiogSW50ZXJmYWNlIG5hbWUgaW4gdGhlIHNvdXJjZSAuZC50cyBmaWxlIChlLmcuLCAnTGFtYmRhRnVuY3Rpb24nKSAqL1xuICBpbnRlcmZhY2VOYW1lOiBzdHJpbmc7XG4gIC8qKiBTb3VyY2UgLmQudHMgZmlsZSBuYW1lIChlLmcuLCAnZnVuY3Rpb25zLmQudHMnKSAqL1xuICBzb3VyY2VGaWxlOiBzdHJpbmc7XG4gIC8qKiBSZXNvdXJjZXMgYW5kIEFXUyBzZXJ2aWNlcyB0aGlzIHJlc291cmNlIGNhbiBjb25uZWN0IHRvLiBHbG9iYWxBd3NTZXJ2aWNlQ29uc3RhbnQgaXMgZm9yIGdsb2JhbCBzZXJ2aWNlcywgZS5nLiBhd3M6c2VzICAqL1xuICBjYW5Db25uZWN0VG8/OiBzdHJpbmdbXTtcbiAgLyoqIFdoZXRoZXIgdGhpcyByZXNvdXJjZSBzdXBwb3J0cyBvdmVycmlkZXMgKGRlZmF1bHQ6IHRydWUpICovXG4gIHN1cHBvcnRzT3ZlcnJpZGVzPzogYm9vbGVhbjtcbiAgLyoqIFdoZXRoZXIgdGhpcyByZXNvdXJjZSBoYXMgYXVnbWVudGVkIGNvbm5lY3RUby9lbnZpcm9ubWVudCBwcm9wcyAoZGVmYXVsdDogZmFsc2UpICovXG4gIGhhc0F1Z21lbnRlZFByb3BzPzogYm9vbGVhbjtcbn07XG5cbi8qKlxuICogQ29tcGxldGUgbGlzdCBvZiBhbGwgU3RhY2t0YXBlIHJlc291cmNlcy5cbiAqIFRoaXMgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggLSBhbGwgY29kZSBnZW5lcmF0aW9uIGRlcml2ZXMgZnJvbSB0aGlzLlxuICovXG5leHBvcnQgY29uc3QgUkVTT1VSQ0VTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVM6IFJlc291cmNlRGVmaW5pdGlvbltdID0gW1xuICB7XG4gICAgY2xhc3NOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICByZXNvdXJjZVR5cGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlJyxcbiAgICBwcm9wc1R5cGU6ICdSZWxhdGlvbmFsRGF0YWJhc2VQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1dlYlNlcnZpY2UnLFxuICAgIHJlc291cmNlVHlwZTogJ3dlYi1zZXJ2aWNlJyxcbiAgICBwcm9wc1R5cGU6ICdXZWJTZXJ2aWNlUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdXZWJTZXJ2aWNlJyxcbiAgICBzb3VyY2VGaWxlOiAnd2ViLXNlcnZpY2VzLmQudHMnLFxuICAgIGhhc0F1Z21lbnRlZFByb3BzOiB0cnVlLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbScsXG4gICAgICAnUHJpdmF0ZVNlcnZpY2UnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUHJpdmF0ZVNlcnZpY2UnLFxuICAgIHJlc291cmNlVHlwZTogJ3ByaXZhdGUtc2VydmljZScsXG4gICAgcHJvcHNUeXBlOiAnUHJpdmF0ZVNlcnZpY2VQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1ByaXZhdGVTZXJ2aWNlJyxcbiAgICBzb3VyY2VGaWxlOiAncHJpdmF0ZS1zZXJ2aWNlcy5kLnRzJyxcbiAgICBoYXNBdWdtZW50ZWRQcm9wczogdHJ1ZSxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnV29ya2VyU2VydmljZScsXG4gICAgcmVzb3VyY2VUeXBlOiAnd29ya2VyLXNlcnZpY2UnLFxuICAgIHByb3BzVHlwZTogJ1dvcmtlclNlcnZpY2VQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1dvcmtlclNlcnZpY2UnLFxuICAgIHNvdXJjZUZpbGU6ICd3b3JrZXItc2VydmljZXMuZC50cycsXG4gICAgaGFzQXVnbWVudGVkUHJvcHM6IHRydWUsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJ1xuICAgIF1cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ011bHRpQ29udGFpbmVyV29ya2xvYWQnLFxuICAgIHJlc291cmNlVHlwZTogJ211bHRpLWNvbnRhaW5lci13b3JrbG9hZCcsXG4gICAgcHJvcHNUeXBlOiAnQ29udGFpbmVyV29ya2xvYWRQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ011bHRpQ29udGFpbmVyV29ya2xvYWQnLFxuICAgIHNvdXJjZUZpbGU6ICdtdWx0aS1jb250YWluZXItd29ya2xvYWRzLmQudHMnLFxuICAgIGhhc0F1Z21lbnRlZFByb3BzOiB0cnVlLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbScsXG4gICAgICAnTGFtYmRhRnVuY3Rpb24nLFxuICAgICAgJ0JhdGNoSm9iJyxcbiAgICAgICdVc2VyQXV0aFBvb2wnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTGFtYmRhRnVuY3Rpb24nLFxuICAgIHJlc291cmNlVHlwZTogJ2Z1bmN0aW9uJyxcbiAgICBwcm9wc1R5cGU6ICdMYW1iZGFGdW5jdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTGFtYmRhRnVuY3Rpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdmdW5jdGlvbnMuZC50cycsXG4gICAgaGFzQXVnbWVudGVkUHJvcHM6IHRydWUsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdQcml2YXRlU2VydmljZScsXG4gICAgICAnV2ViU2VydmljZScsXG4gICAgICAnTGFtYmRhRnVuY3Rpb24nLFxuICAgICAgJ0JhdGNoSm9iJyxcbiAgICAgICdVc2VyQXV0aFBvb2wnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQmF0Y2hKb2InLFxuICAgIHJlc291cmNlVHlwZTogJ2JhdGNoLWpvYicsXG4gICAgcHJvcHNUeXBlOiAnQmF0Y2hKb2JQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0JhdGNoSm9iJyxcbiAgICBzb3VyY2VGaWxlOiAnYmF0Y2gtam9icy5kLnRzJyxcbiAgICBoYXNBdWdtZW50ZWRQcm9wczogdHJ1ZSxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQ29udmV4JyxcbiAgICByZXNvdXJjZVR5cGU6ICdjb252ZXgnLFxuICAgIHByb3BzVHlwZTogJ0NvbnZleFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ29udmV4JyxcbiAgICBzb3VyY2VGaWxlOiAnY29udmV4LmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0J1Y2tldCcsXG4gICAgcmVzb3VyY2VUeXBlOiAnYnVja2V0JyxcbiAgICBwcm9wc1R5cGU6ICdCdWNrZXRQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0J1Y2tldCcsXG4gICAgc291cmNlRmlsZTogJ2J1Y2tldHMuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnSG9zdGluZ0J1Y2tldCcsXG4gICAgcmVzb3VyY2VUeXBlOiAnaG9zdGluZy1idWNrZXQnLFxuICAgIHByb3BzVHlwZTogJ0hvc3RpbmdCdWNrZXRQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0hvc3RpbmdCdWNrZXQnLFxuICAgIHNvdXJjZUZpbGU6ICdob3N0aW5nLWJ1Y2tldHMuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnRHluYW1vRGJUYWJsZScsXG4gICAgcmVzb3VyY2VUeXBlOiAnZHluYW1vLWRiLXRhYmxlJyxcbiAgICBwcm9wc1R5cGU6ICdEeW5hbW9EYlRhYmxlUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdEeW5hbW9EYlRhYmxlJyxcbiAgICBzb3VyY2VGaWxlOiAnZHluYW1vLWRiLXRhYmxlcy5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdFdmVudEJ1cycsXG4gICAgcmVzb3VyY2VUeXBlOiAnZXZlbnQtYnVzJyxcbiAgICBwcm9wc1R5cGU6ICdFdmVudEJ1c1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnRXZlbnRCdXMnLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudC1idXNlcy5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdIdHRwQXBpR2F0ZXdheScsXG4gICAgcmVzb3VyY2VUeXBlOiAnaHR0cC1hcGktZ2F0ZXdheScsXG4gICAgcHJvcHNUeXBlOiAnSHR0cEFwaUdhdGV3YXlQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0h0dHBBcGlHYXRld2F5JyxcbiAgICBzb3VyY2VGaWxlOiAnaHR0cC1hcGktZ2F0ZXdheXMuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXInLFxuICAgIHJlc291cmNlVHlwZTogJ2FwcGxpY2F0aW9uLWxvYWQtYmFsYW5jZXInLFxuICAgIHByb3BzVHlwZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlcicsXG4gICAgc291cmNlRmlsZTogJ2FwcGxpY2F0aW9uLWxvYWQtYmFsYW5jZXJzLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ05ldHdvcmtMb2FkQmFsYW5jZXInLFxuICAgIHJlc291cmNlVHlwZTogJ25ldHdvcmstbG9hZC1iYWxhbmNlcicsXG4gICAgcHJvcHNUeXBlOiAnTmV0d29ya0xvYWRCYWxhbmNlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTmV0d29ya0xvYWRCYWxhbmNlcicsXG4gICAgc291cmNlRmlsZTogJ25ldHdvcmstbG9hZC1iYWxhbmNlci5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZWRpc0NsdXN0ZXInLFxuICAgIHJlc291cmNlVHlwZTogJ3JlZGlzLWNsdXN0ZXInLFxuICAgIHByb3BzVHlwZTogJ1JlZGlzQ2x1c3RlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmVkaXNDbHVzdGVyJyxcbiAgICBzb3VyY2VGaWxlOiAncmVkaXMtY2x1c3Rlci5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICByZXNvdXJjZVR5cGU6ICdtb25nby1kYi1hdGxhcy1jbHVzdGVyJyxcbiAgICBwcm9wc1R5cGU6ICdNb25nb0RiQXRsYXNDbHVzdGVyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICBzb3VyY2VGaWxlOiAnbW9uZ28tZGItYXRsYXMtY2x1c3RlcnMuZC50cycsXG4gICAgc3VwcG9ydHNPdmVycmlkZXM6IGZhbHNlLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1N0YXRlTWFjaGluZScsXG4gICAgcmVzb3VyY2VUeXBlOiAnc3RhdGUtbWFjaGluZScsXG4gICAgcHJvcHNUeXBlOiAnU3RhdGVNYWNoaW5lUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTdGF0ZU1hY2hpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdzdGF0ZS1tYWNoaW5lcy5kLnRzJyxcbiAgICBoYXNBdWdtZW50ZWRQcm9wczogdHJ1ZSxcbiAgICBjYW5Db25uZWN0VG86IFsnRnVuY3Rpb24nLCAnQmF0Y2hKb2InXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnVXNlckF1dGhQb29sJyxcbiAgICByZXNvdXJjZVR5cGU6ICd1c2VyLWF1dGgtcG9vbCcsXG4gICAgcHJvcHNUeXBlOiAnVXNlckF1dGhQb29sUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdVc2VyQXV0aFBvb2wnLFxuICAgIHNvdXJjZUZpbGU6ICd1c2VyLXBvb2xzLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Vwc3Rhc2hSZWRpcycsXG4gICAgcmVzb3VyY2VUeXBlOiAndXBzdGFzaC1yZWRpcycsXG4gICAgcHJvcHNUeXBlOiAnVXBzdGFzaFJlZGlzUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdVcHN0YXNoUmVkaXMnLFxuICAgIHNvdXJjZUZpbGU6ICd1cHN0YXNoLXJlZGlzLmQudHMnLFxuICAgIHN1cHBvcnRzT3ZlcnJpZGVzOiBmYWxzZSxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTcXNRdWV1ZScsXG4gICAgcmVzb3VyY2VUeXBlOiAnc3FzLXF1ZXVlJyxcbiAgICBwcm9wc1R5cGU6ICdTcXNRdWV1ZVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU3FzUXVldWUnLFxuICAgIHNvdXJjZUZpbGU6ICdzcXMtcXVldWVzLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Nuc1RvcGljJyxcbiAgICByZXNvdXJjZVR5cGU6ICdzbnMtdG9waWMnLFxuICAgIHByb3BzVHlwZTogJ1Nuc1RvcGljUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTbnNUb3BpYycsXG4gICAgc291cmNlRmlsZTogJ3Nucy10b3BpYy5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdLaW5lc2lzU3RyZWFtJyxcbiAgICByZXNvdXJjZVR5cGU6ICdraW5lc2lzLXN0cmVhbScsXG4gICAgcHJvcHNUeXBlOiAnS2luZXNpc1N0cmVhbVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnS2luZXNpc1N0cmVhbScsXG4gICAgc291cmNlRmlsZTogJ2tpbmVzaXMtc3RyZWFtcy5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdXZWJBcHBGaXJld2FsbCcsXG4gICAgcmVzb3VyY2VUeXBlOiAnd2ViLWFwcC1maXJld2FsbCcsXG4gICAgcHJvcHNUeXBlOiAnV2ViQXBwRmlyZXdhbGxQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1dlYkFwcEZpcmV3YWxsJyxcbiAgICBzb3VyY2VGaWxlOiAnd2ViLWFwcC1maXJld2FsbC5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICByZXNvdXJjZVR5cGU6ICdvcGVuLXNlYXJjaC1kb21haW4nLFxuICAgIHByb3BzVHlwZTogJ09wZW5TZWFyY2hEb21haW5Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ09wZW5TZWFyY2hEb21haW4nLFxuICAgIHNvdXJjZUZpbGU6ICdvcGVuLXNlYXJjaC5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdFZnNGaWxlc3lzdGVtJyxcbiAgICByZXNvdXJjZVR5cGU6ICdlZnMtZmlsZXN5c3RlbScsXG4gICAgcHJvcHNUeXBlOiAnRWZzRmlsZXN5c3RlbVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnRWZzRmlsZXN5c3RlbScsXG4gICAgc291cmNlRmlsZTogJ2Vmcy1maWxlc3lzdGVtLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ05leHRqc1dlYicsXG4gICAgcmVzb3VyY2VUeXBlOiAnbmV4dGpzLXdlYicsXG4gICAgcHJvcHNUeXBlOiAnTmV4dGpzV2ViUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdOZXh0anNXZWInLFxuICAgIHNvdXJjZUZpbGU6ICduZXh0anMtd2ViLmQudHMnLFxuICAgIGhhc0F1Z21lbnRlZFByb3BzOiB0cnVlLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbScsXG4gICAgICAnUHJpdmF0ZVNlcnZpY2UnLFxuICAgICAgJ1dlYlNlcnZpY2UnLFxuICAgICAgJ0xhbWJkYUZ1bmN0aW9uJyxcbiAgICAgICdCYXRjaEpvYicsXG4gICAgICAnVXNlckF1dGhQb29sJ1xuICAgIF1cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0FzdHJvV2ViJyxcbiAgICByZXNvdXJjZVR5cGU6ICdhc3Ryby13ZWInLFxuICAgIHByb3BzVHlwZTogJ0FzdHJvV2ViUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBc3Ryb1dlYicsXG4gICAgc291cmNlRmlsZTogJ2FzdHJvLXdlYi5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nLFxuICAgICAgJ1ByaXZhdGVTZXJ2aWNlJyxcbiAgICAgICdXZWJTZXJ2aWNlJyxcbiAgICAgICdMYW1iZGFGdW5jdGlvbicsXG4gICAgICAnQmF0Y2hKb2InLFxuICAgICAgJ1VzZXJBdXRoUG9vbCdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdOdXh0V2ViJyxcbiAgICByZXNvdXJjZVR5cGU6ICdudXh0LXdlYicsXG4gICAgcHJvcHNUeXBlOiAnTnV4dFdlYlByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTnV4dFdlYicsXG4gICAgc291cmNlRmlsZTogJ251eHQtd2ViLmQudHMnLFxuICAgIGhhc0F1Z21lbnRlZFByb3BzOiB0cnVlLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbScsXG4gICAgICAnUHJpdmF0ZVNlcnZpY2UnLFxuICAgICAgJ1dlYlNlcnZpY2UnLFxuICAgICAgJ0xhbWJkYUZ1bmN0aW9uJyxcbiAgICAgICdCYXRjaEpvYicsXG4gICAgICAnVXNlckF1dGhQb29sJ1xuICAgIF1cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1N2ZWx0ZUtpdFdlYicsXG4gICAgcmVzb3VyY2VUeXBlOiAnc3ZlbHRla2l0LXdlYicsXG4gICAgcHJvcHNUeXBlOiAnU3ZlbHRlS2l0V2ViUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTdmVsdGVLaXRXZWInLFxuICAgIHNvdXJjZUZpbGU6ICdzdmVsdGVraXQtd2ViLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbScsXG4gICAgICAnUHJpdmF0ZVNlcnZpY2UnLFxuICAgICAgJ1dlYlNlcnZpY2UnLFxuICAgICAgJ0xhbWJkYUZ1bmN0aW9uJyxcbiAgICAgICdCYXRjaEpvYicsXG4gICAgICAnVXNlckF1dGhQb29sJ1xuICAgIF1cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1NvbGlkU3RhcnRXZWInLFxuICAgIHJlc291cmNlVHlwZTogJ3NvbGlkc3RhcnQtd2ViJyxcbiAgICBwcm9wc1R5cGU6ICdTb2xpZFN0YXJ0V2ViUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTb2xpZFN0YXJ0V2ViJyxcbiAgICBzb3VyY2VGaWxlOiAnc29saWRzdGFydC13ZWIuZC50cycsXG4gICAgY2FuQ29ubmVjdFRvOiBbXG4gICAgICAnUmVsYXRpb25hbERhdGFiYXNlJyxcbiAgICAgICdCdWNrZXQnLFxuICAgICAgJ0hvc3RpbmdCdWNrZXQnLFxuICAgICAgJ0R5bmFtb0RiVGFibGUnLFxuICAgICAgJ0V2ZW50QnVzJyxcbiAgICAgICdSZWRpc0NsdXN0ZXInLFxuICAgICAgJ01vbmdvRGJBdGxhc0NsdXN0ZXInLFxuICAgICAgJ1Vwc3Rhc2hSZWRpcycsXG4gICAgICAnU3FzUXVldWUnLFxuICAgICAgJ1Nuc1RvcGljJyxcbiAgICAgICdLaW5lc2lzU3RyZWFtJyxcbiAgICAgICdPcGVuU2VhcmNoRG9tYWluJyxcbiAgICAgICdFZnNGaWxlc3lzdGVtJyxcbiAgICAgICdQcml2YXRlU2VydmljZScsXG4gICAgICAnV2ViU2VydmljZScsXG4gICAgICAnTGFtYmRhRnVuY3Rpb24nLFxuICAgICAgJ0JhdGNoSm9iJyxcbiAgICAgICdVc2VyQXV0aFBvb2wnXG4gICAgXVxuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnVGFuU3RhY2tXZWInLFxuICAgIHJlc291cmNlVHlwZTogJ3RhbnN0YWNrLXdlYicsXG4gICAgcHJvcHNUeXBlOiAnVGFuU3RhY2tXZWJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1RhblN0YWNrV2ViJyxcbiAgICBzb3VyY2VGaWxlOiAndGFuc3RhY2std2ViLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW1xuICAgICAgJ1JlbGF0aW9uYWxEYXRhYmFzZScsXG4gICAgICAnQnVja2V0JyxcbiAgICAgICdIb3N0aW5nQnVja2V0JyxcbiAgICAgICdEeW5hbW9EYlRhYmxlJyxcbiAgICAgICdFdmVudEJ1cycsXG4gICAgICAnUmVkaXNDbHVzdGVyJyxcbiAgICAgICdNb25nb0RiQXRsYXNDbHVzdGVyJyxcbiAgICAgICdVcHN0YXNoUmVkaXMnLFxuICAgICAgJ1Nxc1F1ZXVlJyxcbiAgICAgICdTbnNUb3BpYycsXG4gICAgICAnS2luZXNpc1N0cmVhbScsXG4gICAgICAnT3BlblNlYXJjaERvbWFpbicsXG4gICAgICAnRWZzRmlsZXN5c3RlbScsXG4gICAgICAnUHJpdmF0ZVNlcnZpY2UnLFxuICAgICAgJ1dlYlNlcnZpY2UnLFxuICAgICAgJ0xhbWJkYUZ1bmN0aW9uJyxcbiAgICAgICdCYXRjaEpvYicsXG4gICAgICAnVXNlckF1dGhQb29sJ1xuICAgIF1cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1JlbWl4V2ViJyxcbiAgICByZXNvdXJjZVR5cGU6ICdyZW1peC13ZWInLFxuICAgIHByb3BzVHlwZTogJ1JlbWl4V2ViUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZW1peFdlYicsXG4gICAgc291cmNlRmlsZTogJ3JlbWl4LXdlYi5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nLFxuICAgICAgJ1ByaXZhdGVTZXJ2aWNlJyxcbiAgICAgICdXZWJTZXJ2aWNlJyxcbiAgICAgICdMYW1iZGFGdW5jdGlvbicsXG4gICAgICAnQmF0Y2hKb2InLFxuICAgICAgJ1VzZXJBdXRoUG9vbCdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdCYXN0aW9uJyxcbiAgICByZXNvdXJjZVR5cGU6ICdiYXN0aW9uJyxcbiAgICBwcm9wc1R5cGU6ICdCYXN0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdCYXN0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnYmFzdGlvbi5kLnRzJyxcbiAgICBjYW5Db25uZWN0VG86IFtdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBZ2VudENvcmVSdW50aW1lJyxcbiAgICByZXNvdXJjZVR5cGU6ICdhZ2VudGNvcmUtcnVudGltZScsXG4gICAgcHJvcHNUeXBlOiAnQWdlbnRDb3JlUnVudGltZVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQWdlbnRDb3JlUnVudGltZScsXG4gICAgc291cmNlRmlsZTogJ2FnZW50Y29yZS5kLnRzJyxcbiAgICBoYXNBdWdtZW50ZWRQcm9wczogdHJ1ZSxcbiAgICBjYW5Db25uZWN0VG86IFtcbiAgICAgICdSZWxhdGlvbmFsRGF0YWJhc2UnLFxuICAgICAgJ0J1Y2tldCcsXG4gICAgICAnSG9zdGluZ0J1Y2tldCcsXG4gICAgICAnRHluYW1vRGJUYWJsZScsXG4gICAgICAnRXZlbnRCdXMnLFxuICAgICAgJ1JlZGlzQ2x1c3RlcicsXG4gICAgICAnTW9uZ29EYkF0bGFzQ2x1c3RlcicsXG4gICAgICAnVXBzdGFzaFJlZGlzJyxcbiAgICAgICdTcXNRdWV1ZScsXG4gICAgICAnU25zVG9waWMnLFxuICAgICAgJ0tpbmVzaXNTdHJlYW0nLFxuICAgICAgJ09wZW5TZWFyY2hEb21haW4nLFxuICAgICAgJ0Vmc0ZpbGVzeXN0ZW0nLFxuICAgICAgJ1ByaXZhdGVTZXJ2aWNlJyxcbiAgICAgICdXZWJTZXJ2aWNlJyxcbiAgICAgICdMYW1iZGFGdW5jdGlvbicsXG4gICAgICAnQmF0Y2hKb2InLFxuICAgICAgJ1VzZXJBdXRoUG9vbCdcbiAgICBdXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBZ2VudENvcmVNZW1vcnknLFxuICAgIHJlc291cmNlVHlwZTogJ2FnZW50Y29yZS1tZW1vcnknLFxuICAgIHByb3BzVHlwZTogJ0FnZW50Q29yZU1lbW9yeVByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQWdlbnRDb3JlTWVtb3J5JyxcbiAgICBzb3VyY2VGaWxlOiAnYWdlbnRjb3JlLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0FnZW50Q29yZUdhdGV3YXknLFxuICAgIHJlc291cmNlVHlwZTogJ2FnZW50Y29yZS1nYXRld2F5JyxcbiAgICBwcm9wc1R5cGU6ICdBZ2VudENvcmVHYXRld2F5UHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBZ2VudENvcmVHYXRld2F5JyxcbiAgICBzb3VyY2VGaWxlOiAnYWdlbnRjb3JlLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0FnZW50Q29yZUJyb3dzZXInLFxuICAgIHJlc291cmNlVHlwZTogJ2FnZW50Y29yZS1icm93c2VyJyxcbiAgICBwcm9wc1R5cGU6ICdBZ2VudENvcmVCcm93c2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBZ2VudENvcmVCcm93c2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWdlbnRjb3JlLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0FnZW50Q29yZUNvZGVJbnRlcnByZXRlcicsXG4gICAgcmVzb3VyY2VUeXBlOiAnYWdlbnRjb3JlLWNvZGUtaW50ZXJwcmV0ZXInLFxuICAgIHByb3BzVHlwZTogJ0FnZW50Q29yZUNvZGVJbnRlcnByZXRlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQWdlbnRDb3JlQ29kZUludGVycHJldGVyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWdlbnRjb3JlLmQudHMnLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0F3c0Nka0NvbnN0cnVjdCcsXG4gICAgcmVzb3VyY2VUeXBlOiAnYXdzLWNkay1jb25zdHJ1Y3QnLFxuICAgIHByb3BzVHlwZTogJ0F3c0Nka0NvbnN0cnVjdFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXdzQ2RrQ29uc3RydWN0JyxcbiAgICBzb3VyY2VGaWxlOiAnYXdzLWNkay1jb25zdHJ1Y3QuZC50cycsXG4gICAgc3VwcG9ydHNPdmVycmlkZXM6IGZhbHNlLFxuICAgIGNhbkNvbm5lY3RUbzogW11cbiAgfVxuXTtcblxuLyoqXG4gKiBEZWZpbmVzIGFsbCB0eXBlICsgcHJvcGVydGllcyBzaGFwZWQgZGVmaW5pdGlvbnMgdGhhdCBjYW4gYmUgY29udmVydGVkIHRvIGEgVHlwZXNjcmlwdCBjbGFzc1xuICovXG5leHBvcnQgdHlwZSBUeXBlUHJvcGVydGllc0RlZmluaXRpb24gPSB7XG4gIGNsYXNzTmFtZTogc3RyaW5nO1xuICB0eXBlVmFsdWU6IHN0cmluZztcbiAgcHJvcHNUeXBlOiBzdHJpbmc7XG4gIGludGVyZmFjZU5hbWU6IHN0cmluZztcbiAgc291cmNlRmlsZTogc3RyaW5nO1xuICAvKiogSWYgdHJ1ZSwgdGhpcyB0eXBlIGhhcyBubyBwcm9wZXJ0aWVzIGZpZWxkIC0ganVzdCBhIHR5cGUgZGlzY3JpbWluYXRvciAqL1xuICB0eXBlT25seT86IGJvb2xlYW47XG4gIC8qKiBDdXN0b20gSlNEb2MgZGVzY3JpcHRpb24gZm9yIHRoZSBjbGFzcyBjb25zdHJ1Y3RvciAqL1xuICBqc2RvYz86IHN0cmluZztcbn07XG5cbmV4cG9ydCBjb25zdCBNSVNDX1RZUEVTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVM6IFR5cGVQcm9wZXJ0aWVzRGVmaW5pdGlvbltdID0gW1xuICAvLyBEYXRhYmFzZSBFbmdpbmVzXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVQb3N0Z3JlcycsXG4gICAgdHlwZVZhbHVlOiAncG9zdGdyZXMnLFxuICAgIHByb3BzVHlwZTogJ1Jkc0VuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZHNFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmRzRW5naW5lTWFyaWFkYicsXG4gICAgdHlwZVZhbHVlOiAnbWFyaWFkYicsXG4gICAgcHJvcHNUeXBlOiAnUmRzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Jkc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVNeXNxbCcsXG4gICAgdHlwZVZhbHVlOiAnbXlzcWwnLFxuICAgIHByb3BzVHlwZTogJ1Jkc0VuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZHNFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmRzRW5naW5lT3JhY2xlRUUnLFxuICAgIHR5cGVWYWx1ZTogJ29yYWNsZS1lZScsXG4gICAgcHJvcHNUeXBlOiAnUmRzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Jkc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVPcmFjbGVTRTInLFxuICAgIHR5cGVWYWx1ZTogJ29yYWNsZS1zZTInLFxuICAgIHByb3BzVHlwZTogJ1Jkc0VuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZHNFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmRzRW5naW5lU3FsU2VydmVyRUUnLFxuICAgIHR5cGVWYWx1ZTogJ3NxbHNlcnZlci1lZScsXG4gICAgcHJvcHNUeXBlOiAnUmRzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Jkc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSZHNFbmdpbmVTcWxTZXJ2ZXJFWCcsXG4gICAgdHlwZVZhbHVlOiAnc3Fsc2VydmVyLWV4JyxcbiAgICBwcm9wc1R5cGU6ICdSZHNFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmRzRW5naW5lJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Jkc0VuZ2luZVNxbFNlcnZlclNFJyxcbiAgICB0eXBlVmFsdWU6ICdzcWxzZXJ2ZXItc2UnLFxuICAgIHByb3BzVHlwZTogJ1Jkc0VuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdSZHNFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmRzRW5naW5lU3FsU2VydmVyV2ViJyxcbiAgICB0eXBlVmFsdWU6ICdzcWxzZXJ2ZXItd2ViJyxcbiAgICBwcm9wc1R5cGU6ICdSZHNFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmRzRW5naW5lJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0F1cm9yYUVuZ2luZVBvc3RncmVzcWwnLFxuICAgIHR5cGVWYWx1ZTogJ2F1cm9yYS1wb3N0Z3Jlc3FsJyxcbiAgICBwcm9wc1R5cGU6ICdBdXJvcmFFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXVyb3JhRW5naW5lJyxcbiAgICBzb3VyY2VGaWxlOiAncmVsYXRpb25hbC1kYXRhYmFzZXMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0F1cm9yYUVuZ2luZU15c3FsJyxcbiAgICB0eXBlVmFsdWU6ICdhdXJvcmEtbXlzcWwnLFxuICAgIHByb3BzVHlwZTogJ0F1cm9yYUVuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBdXJvcmFFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXVyb3JhU2VydmVybGVzc0VuZ2luZVBvc3RncmVzcWwnLFxuICAgIHR5cGVWYWx1ZTogJ2F1cm9yYS1wb3N0Z3Jlc3FsLXNlcnZlcmxlc3MnLFxuICAgIHByb3BzVHlwZTogJ0F1cm9yYVNlcnZlcmxlc3NFbmdpbmVQcm9wZXJ0aWVzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXVyb3JhU2VydmVybGVzc0VuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBdXJvcmFTZXJ2ZXJsZXNzRW5naW5lTXlzcWwnLFxuICAgIHR5cGVWYWx1ZTogJ2F1cm9yYS1teXNxbC1zZXJ2ZXJsZXNzJyxcbiAgICBwcm9wc1R5cGU6ICdBdXJvcmFTZXJ2ZXJsZXNzRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0F1cm9yYVNlcnZlcmxlc3NFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXVyb3JhU2VydmVybGVzc1YyRW5naW5lUG9zdGdyZXNxbCcsXG4gICAgdHlwZVZhbHVlOiAnYXVyb3JhLXBvc3RncmVzcWwtc2VydmVybGVzcy12MicsXG4gICAgcHJvcHNUeXBlOiAnQXVyb3JhU2VydmVybGVzc1YyRW5naW5lUHJvcGVydGllcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0F1cm9yYVNlcnZlcmxlc3NWMkVuZ2luZScsXG4gICAgc291cmNlRmlsZTogJ3JlbGF0aW9uYWwtZGF0YWJhc2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdBdXJvcmFTZXJ2ZXJsZXNzVjJFbmdpbmVNeXNxbCcsXG4gICAgdHlwZVZhbHVlOiAnYXVyb3JhLW15c3FsLXNlcnZlcmxlc3MtdjInLFxuICAgIHByb3BzVHlwZTogJ0F1cm9yYVNlcnZlcmxlc3NWMkVuZ2luZVByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBdXJvcmFTZXJ2ZXJsZXNzVjJFbmdpbmUnLFxuICAgIHNvdXJjZUZpbGU6ICdyZWxhdGlvbmFsLWRhdGFiYXNlcy5kLnRzJ1xuICB9LFxuICAvLyBMYW1iZGEgUGFja2FnaW5nXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTdGFja3RhcGVMYW1iZGFCdWlsZHBhY2tQYWNrYWdpbmcnLFxuICAgIHR5cGVWYWx1ZTogJ3N0YWNrdGFwZS1sYW1iZGEtYnVpbGRwYWNrJyxcbiAgICBwcm9wc1R5cGU6ICdTdHBCdWlsZHBhY2tMYW1iZGFQYWNrYWdpbmdQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1N0cEJ1aWxkcGFja0xhbWJkYVBhY2thZ2luZycsXG4gICAgc291cmNlRmlsZTogJ2RlcGxveW1lbnQtYXJ0aWZhY3RzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDdXN0b21BcnRpZmFjdExhbWJkYVBhY2thZ2luZycsXG4gICAgdHlwZVZhbHVlOiAnY3VzdG9tLWFydGlmYWN0JyxcbiAgICBwcm9wc1R5cGU6ICdDdXN0b21BcnRpZmFjdExhbWJkYVBhY2thZ2luZ1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ3VzdG9tQXJ0aWZhY3RMYW1iZGFQYWNrYWdpbmcnLFxuICAgIHNvdXJjZUZpbGU6ICdkZXBsb3ltZW50LWFydGlmYWN0cy5kLnRzJ1xuICB9LFxuICAvLyBDb250YWluZXIgUGFja2FnaW5nXG4gIHtcbiAgICBjbGFzc05hbWU6ICdQcmVidWlsdEltYWdlUGFja2FnaW5nJyxcbiAgICB0eXBlVmFsdWU6ICdwcmVidWlsdC1pbWFnZScsXG4gICAgcHJvcHNUeXBlOiAnUHJlYnVpbHRJbWFnZUN3UGFja2FnaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdQcmVidWlsdEN3SW1hZ2VQYWNrYWdpbmcnLFxuICAgIHNvdXJjZUZpbGU6ICdkZXBsb3ltZW50LWFydGlmYWN0cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQ3VzdG9tRG9ja2VyZmlsZVBhY2thZ2luZycsXG4gICAgdHlwZVZhbHVlOiAnY3VzdG9tLWRvY2tlcmZpbGUnLFxuICAgIHByb3BzVHlwZTogJ0N1c3RvbURvY2tlcmZpbGVDd0ltYWdlUGFja2FnaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDdXN0b21Eb2NrZXJmaWxlQ3dJbWFnZVBhY2thZ2luZycsXG4gICAgc291cmNlRmlsZTogJ2RlcGxveW1lbnQtYXJ0aWZhY3RzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdFeHRlcm5hbEJ1aWxkcGFja1BhY2thZ2luZycsXG4gICAgdHlwZVZhbHVlOiAnZXh0ZXJuYWwtYnVpbGRwYWNrJyxcbiAgICBwcm9wc1R5cGU6ICdFeHRlcm5hbEJ1aWxkcGFja0N3SW1hZ2VQYWNrYWdpbmdQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0V4dGVybmFsQnVpbGRwYWNrQ3dJbWFnZVBhY2thZ2luZycsXG4gICAgc291cmNlRmlsZTogJ2RlcGxveW1lbnQtYXJ0aWZhY3RzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdOaXhwYWNrc1BhY2thZ2luZycsXG4gICAgdHlwZVZhbHVlOiAnbml4cGFja3MnLFxuICAgIHByb3BzVHlwZTogJ05peHBhY2tzQ3dJbWFnZVBhY2thZ2luZ1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTml4cGFja3NDd0ltYWdlUGFja2FnaW5nJyxcbiAgICBzb3VyY2VGaWxlOiAnZGVwbG95bWVudC1hcnRpZmFjdHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1N0YWNrdGFwZUltYWdlQnVpbGRwYWNrUGFja2FnaW5nJyxcbiAgICB0eXBlVmFsdWU6ICdzdGFja3RhcGUtaW1hZ2UtYnVpbGRwYWNrJyxcbiAgICBwcm9wc1R5cGU6ICdTdHBCdWlsZHBhY2tDd0ltYWdlUGFja2FnaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTdHBCdWlsZHBhY2tDd0ltYWdlUGFja2FnaW5nJyxcbiAgICBzb3VyY2VGaWxlOiAnZGVwbG95bWVudC1hcnRpZmFjdHMuZC50cydcbiAgfSxcbiAgLy8gTGFtYmRhIEZ1bmN0aW9uIEV2ZW50cy9JbnRlZ3JhdGlvbnNcbiAge1xuICAgIGNsYXNzTmFtZTogJ0h0dHBBcGlJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnaHR0cC1hcGktZ2F0ZXdheScsXG4gICAgcHJvcHNUeXBlOiAnSHR0cEFwaUludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdIdHRwQXBpSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1MzSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ3MzJyxcbiAgICBwcm9wc1R5cGU6ICdTM0ludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdTM0ludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTY2hlZHVsZUludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdzY2hlZHVsZScsXG4gICAgcHJvcHNUeXBlOiAnU2NoZWR1bGVJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU2NoZWR1bGVJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnU25zSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ3NucycsXG4gICAgcHJvcHNUeXBlOiAnU25zSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Nuc0ludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdTcXNJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnc3FzJyxcbiAgICBwcm9wc1R5cGU6ICdTcXNJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU3FzSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdldmVudHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0tpbmVzaXNJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAna2luZXNpcy1zdHJlYW0nLFxuICAgIHByb3BzVHlwZTogJ0tpbmVzaXNJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnS2luZXNpc0ludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdEeW5hbW9EYkludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdkeW5hbW8tZGItc3RyZWFtJyxcbiAgICBwcm9wc1R5cGU6ICdEeW5hbW9EYkludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdEeW5hbW9EYkludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDbG91ZHdhdGNoTG9nSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2Nsb3Vkd2F0Y2gtbG9nJyxcbiAgICBwcm9wc1R5cGU6ICdDbG91ZHdhdGNoTG9nSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0Nsb3Vkd2F0Y2hMb2dJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlcicsXG4gICAgcHJvcHNUeXBlOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnRXZlbnRCdXNJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnZXZlbnQtYnVzJyxcbiAgICBwcm9wc1R5cGU6ICdFdmVudEJ1c0ludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdFdmVudEJ1c0ludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdLYWZrYVRvcGljSW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2thZmthLXRvcGljJyxcbiAgICBwcm9wc1R5cGU6ICdLYWZrYVRvcGljSW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0thZmthVG9waWNJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQWxhcm1JbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnY2xvdWR3YXRjaC1hbGFybScsXG4gICAgcHJvcHNUeXBlOiAnQWxhcm1JbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQWxhcm1JbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ2V2ZW50cy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnSW90SW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2lvdCcsXG4gICAgcHJvcHNUeXBlOiAnSW90SW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0lvdEludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZXZlbnRzLmQudHMnXG4gIH0sXG4gIC8vIENETiBSb3V0ZXNcbiAge1xuICAgIGNsYXNzTmFtZTogJ0NkbkxvYWRCYWxhbmNlclJvdXRlJyxcbiAgICB0eXBlVmFsdWU6ICdhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyJyxcbiAgICBwcm9wc1R5cGU6ICdDZG5Mb2FkQmFsYW5jZXJPcmlnaW4nLFxuICAgIGludGVyZmFjZU5hbWU6ICdDZG5Mb2FkQmFsYW5jZXJPcmlnaW4nLFxuICAgIHNvdXJjZUZpbGU6ICdjZG4uZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0Nkbkh0dHBBcGlHYXRld2F5Um91dGUnLFxuICAgIHR5cGVWYWx1ZTogJ2h0dHAtYXBpLWdhdGV3YXknLFxuICAgIHByb3BzVHlwZTogJ0Nkbkh0dHBBcGlHYXRld2F5T3JpZ2luJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ2RuSHR0cEFwaUdhdGV3YXlPcmlnaW4nLFxuICAgIHNvdXJjZUZpbGU6ICdjZG4uZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0NkbkxhbWJkYUZ1bmN0aW9uUm91dGUnLFxuICAgIHR5cGVWYWx1ZTogJ2Z1bmN0aW9uJyxcbiAgICBwcm9wc1R5cGU6ICdDZG5MYW1iZGFGdW5jdGlvbk9yaWdpbicsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0NkbkxhbWJkYUZ1bmN0aW9uT3JpZ2luJyxcbiAgICBzb3VyY2VGaWxlOiAnY2RuLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDZG5DdXN0b21Eb21haW5Sb3V0ZScsXG4gICAgdHlwZVZhbHVlOiAnY3VzdG9tLW9yaWdpbicsXG4gICAgcHJvcHNUeXBlOiAnQ2RuQ3VzdG9tT3JpZ2luJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ2RuQ3VzdG9tT3JpZ2luJyxcbiAgICBzb3VyY2VGaWxlOiAnY2RuLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDZG5CdWNrZXRSb3V0ZScsXG4gICAgdHlwZVZhbHVlOiAnYnVja2V0JyxcbiAgICBwcm9wc1R5cGU6ICdDZG5CdWNrZXRPcmlnaW4nLFxuICAgIGludGVyZmFjZU5hbWU6ICdDZG5CdWNrZXRPcmlnaW4nLFxuICAgIHNvdXJjZUZpbGU6ICdjZG4uZC50cydcbiAgfSxcbiAgLy8gV2ViIEFwcCBGaXJld2FsbCBSdWxlc1xuICB7XG4gICAgY2xhc3NOYW1lOiAnTWFuYWdlZFJ1bGVHcm91cCcsXG4gICAgdHlwZVZhbHVlOiAnbWFuYWdlZC1ydWxlLWdyb3VwJyxcbiAgICBwcm9wc1R5cGU6ICdNYW5hZ2VkUnVsZUdyb3VwUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdNYW5hZ2VkUnVsZUdyb3VwJyxcbiAgICBzb3VyY2VGaWxlOiAnd2ViLWFwcC1maXJld2FsbC5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQ3VzdG9tUnVsZUdyb3VwJyxcbiAgICB0eXBlVmFsdWU6ICdjdXN0b20tcnVsZS1ncm91cCcsXG4gICAgcHJvcHNUeXBlOiAnQ3VzdG9tUnVsZUdyb3VwUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDdXN0b21SdWxlR3JvdXAnLFxuICAgIHNvdXJjZUZpbGU6ICd3ZWItYXBwLWZpcmV3YWxsLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdSYXRlQmFzZWRSdWxlJyxcbiAgICB0eXBlVmFsdWU6ICdyYXRlLWJhc2VkLXJ1bGUnLFxuICAgIHByb3BzVHlwZTogJ1JhdGVCYXNlZFN0YXRlbWVudFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmF0ZUJhc2VkUnVsZScsXG4gICAgc291cmNlRmlsZTogJ3dlYi1hcHAtZmlyZXdhbGwuZC50cydcbiAgfSxcbiAgLy8gU1FTIFF1ZXVlIEludGVncmF0aW9uc1xuICB7XG4gICAgY2xhc3NOYW1lOiAnU3FzUXVldWVFdmVudEJ1c0ludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdldmVudC1idXMnLFxuICAgIHByb3BzVHlwZTogJ1Nxc1F1ZXVlRXZlbnRCdXNJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU3FzUXVldWVFdmVudEJ1c0ludGVncmF0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnc3FzLXF1ZXVlcy5kLnRzJ1xuICB9LFxuICAvLyBNdWx0aSBDb250YWluZXIgV29ya2xvYWQgSW50ZWdyYXRpb25zXG4gIHtcbiAgICBjbGFzc05hbWU6ICdNdWx0aUNvbnRhaW5lcldvcmtsb2FkSHR0cEFwaUludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdodHRwLWFwaS1nYXRld2F5JyxcbiAgICBwcm9wc1R5cGU6ICdDb250YWluZXJXb3JrbG9hZEh0dHBBcGlJbnRlZ3JhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQ29udGFpbmVyV29ya2xvYWRIdHRwQXBpSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdtdWx0aS1jb250YWluZXItd29ya2xvYWRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdNdWx0aUNvbnRhaW5lcldvcmtsb2FkTG9hZEJhbGFuY2VySW50ZWdyYXRpb24nLFxuICAgIHR5cGVWYWx1ZTogJ2FwcGxpY2F0aW9uLWxvYWQtYmFsYW5jZXInLFxuICAgIHByb3BzVHlwZTogJ0NvbnRhaW5lcldvcmtsb2FkTG9hZEJhbGFuY2VySW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0NvbnRhaW5lcldvcmtsb2FkTG9hZEJhbGFuY2VySW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdtdWx0aS1jb250YWluZXItd29ya2xvYWRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdNdWx0aUNvbnRhaW5lcldvcmtsb2FkTmV0d29ya0xvYWRCYWxhbmNlckludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICduZXR3b3JrLWxvYWQtYmFsYW5jZXInLFxuICAgIHByb3BzVHlwZTogJ0NvbnRhaW5lcldvcmtsb2FkTmV0d29ya0xvYWRCYWxhbmNlckludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDb250YWluZXJXb3JrbG9hZE5ldHdvcmtMb2FkQmFsYW5jZXJJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ211bHRpLWNvbnRhaW5lci13b3JrbG9hZHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ011bHRpQ29udGFpbmVyV29ya2xvYWRJbnRlcm5hbEludGVncmF0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICd3b3JrbG9hZC1pbnRlcm5hbCcsXG4gICAgcHJvcHNUeXBlOiAnQ29udGFpbmVyV29ya2xvYWRJbnRlcm5hbEludGVncmF0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDb250YWluZXJXb3JrbG9hZEludGVybmFsSW50ZWdyYXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdtdWx0aS1jb250YWluZXItd29ya2xvYWRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdNdWx0aUNvbnRhaW5lcldvcmtsb2FkU2VydmljZUNvbm5lY3RJbnRlZ3JhdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnc2VydmljZS1jb25uZWN0JyxcbiAgICBwcm9wc1R5cGU6ICdDb250YWluZXJXb3JrbG9hZFNlcnZpY2VDb25uZWN0SW50ZWdyYXRpb25Qcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0NvbnRhaW5lcldvcmtsb2FkU2VydmljZUNvbm5lY3RJbnRlZ3JhdGlvbicsXG4gICAgc291cmNlRmlsZTogJ211bHRpLWNvbnRhaW5lci13b3JrbG9hZHMuZC50cydcbiAgfSxcbiAgLy8gU2NyaXB0c1xuICB7XG4gICAgY2xhc3NOYW1lOiAnTG9jYWxTY3JpcHQnLFxuICAgIHR5cGVWYWx1ZTogJ2xvY2FsLXNjcmlwdCcsXG4gICAgcHJvcHNUeXBlOiAnTG9jYWxTY3JpcHRQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0xvY2FsU2NyaXB0JyxcbiAgICBzb3VyY2VGaWxlOiAnX19oZWxwZXJzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdCYXN0aW9uU2NyaXB0JyxcbiAgICB0eXBlVmFsdWU6ICdiYXN0aW9uLXNjcmlwdCcsXG4gICAgcHJvcHNUeXBlOiAnQmFzdGlvblNjcmlwdFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQmFzdGlvblNjcmlwdCcsXG4gICAgc291cmNlRmlsZTogJ19faGVscGVycy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnTG9jYWxTY3JpcHRXaXRoQmFzdGlvblR1bm5lbGluZycsXG4gICAgdHlwZVZhbHVlOiAnbG9jYWwtc2NyaXB0LXdpdGgtYmFzdGlvbi10dW5uZWxpbmcnLFxuICAgIHByb3BzVHlwZTogJ0xvY2FsU2NyaXB0V2l0aEJhc3Rpb25UdW5uZWxpbmdQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0xvY2FsU2NyaXB0V2l0aEJhc3Rpb25UdW5uZWxpbmcnLFxuICAgIHNvdXJjZUZpbGU6ICdfX2hlbHBlcnMuZC50cydcbiAgfSxcbiAgLy8gTG9nIEZvcndhcmRpbmdcbiAge1xuICAgIGNsYXNzTmFtZTogJ0h0dHBFbmRwb2ludExvZ0ZvcndhcmRpbmcnLFxuICAgIHR5cGVWYWx1ZTogJ2h0dHAtZW5kcG9pbnQnLFxuICAgIHByb3BzVHlwZTogJ0h0dHBFbmRwb2ludExvZ0ZvcndhcmRpbmdQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0h0dHBFbmRwb2ludExvZ0ZvcndhcmRpbmcnLFxuICAgIHNvdXJjZUZpbGU6ICdfX2hlbHBlcnMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0hpZ2hsaWdodExvZ0ZvcndhcmRpbmcnLFxuICAgIHR5cGVWYWx1ZTogJ2hpZ2hsaWdodCcsXG4gICAgcHJvcHNUeXBlOiAnSGlnaGxpZ2h0TG9nRm9yd2FyZGluZ1Byb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnSGlnaGxpZ2h0TG9nRm9yd2FyZGluZycsXG4gICAgc291cmNlRmlsZTogJ19faGVscGVycy5kLnRzJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnRGF0YWRvZ0xvZ0ZvcndhcmRpbmcnLFxuICAgIHR5cGVWYWx1ZTogJ2RhdGFkb2cnLFxuICAgIHByb3BzVHlwZTogJ0RhdGFkb2dMb2dGb3J3YXJkaW5nUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdEYXRhZG9nTG9nRm9yd2FyZGluZycsXG4gICAgc291cmNlRmlsZTogJ19faGVscGVycy5kLnRzJ1xuICB9LFxuICAvLyBCdWNrZXQgTGlmZWN5Y2xlIFJ1bGVzXG4gIHtcbiAgICBjbGFzc05hbWU6ICdFeHBpcmF0aW9uTGlmZWN5Y2xlUnVsZScsXG4gICAgdHlwZVZhbHVlOiAnZXhwaXJhdGlvbicsXG4gICAgcHJvcHNUeXBlOiAnRXhwaXJhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnRXhwaXJhdGlvbkxpZmVjeWNsZVJ1bGUnLFxuICAgIHNvdXJjZUZpbGU6ICdidWNrZXRzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdOb25DdXJyZW50VmVyc2lvbkV4cGlyYXRpb25MaWZlY3ljbGVSdWxlJyxcbiAgICB0eXBlVmFsdWU6ICdub24tY3VycmVudC12ZXJzaW9uLWV4cGlyYXRpb24nLFxuICAgIHByb3BzVHlwZTogJ05vbkN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTm9uQ3VycmVudFZlcnNpb25FeHBpcmF0aW9uTGlmZWN5Y2xlUnVsZScsXG4gICAgc291cmNlRmlsZTogJ2J1Y2tldHMuZC50cydcbiAgfSxcbiAgLy8gVm9sdW1lIE1vdW50c1xuICB7XG4gICAgY2xhc3NOYW1lOiAnQ29udGFpbmVyRWZzTW91bnQnLFxuICAgIHR5cGVWYWx1ZTogJ2VmcycsXG4gICAgcHJvcHNUeXBlOiAnQ29udGFpbmVyRWZzTW91bnRQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0NvbnRhaW5lckVmc01vdW50JyxcbiAgICBzb3VyY2VGaWxlOiAnX19oZWxwZXJzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdMYW1iZGFFZnNNb3VudCcsXG4gICAgdHlwZVZhbHVlOiAnZWZzJyxcbiAgICBwcm9wc1R5cGU6ICdMYW1iZGFFZnNNb3VudFByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTGFtYmRhRWZzTW91bnQnLFxuICAgIHNvdXJjZUZpbGU6ICdmdW5jdGlvbnMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0xhbWJkYVMzRmlsZXNNb3VudCcsXG4gICAgdHlwZVZhbHVlOiAnczNmaWxlcycsXG4gICAgcHJvcHNUeXBlOiAnTGFtYmRhUzNGaWxlc01vdW50UHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdMYW1iZGFTM0ZpbGVzTW91bnQnLFxuICAgIHNvdXJjZUZpbGU6ICdmdW5jdGlvbnMuZC50cydcbiAgfSxcbiAgLy8gQXV0aG9yaXplcnNcbiAge1xuICAgIGNsYXNzTmFtZTogJ0NvZ25pdG9BdXRob3JpemVyJyxcbiAgICB0eXBlVmFsdWU6ICdjb2duaXRvJyxcbiAgICBwcm9wc1R5cGU6ICdDb2duaXRvQXV0aG9yaXplclByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDb2duaXRvQXV0aG9yaXplcicsXG4gICAgc291cmNlRmlsZTogJ3VzZXItcG9vbHMuZC50cydcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0xhbWJkYUF1dGhvcml6ZXInLFxuICAgIHR5cGVWYWx1ZTogJ2xhbWJkYScsXG4gICAgcHJvcHNUeXBlOiAnTGFtYmRhQXV0aG9yaXplclByb3BlcnRpZXMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdMYW1iZGFBdXRob3JpemVyJyxcbiAgICBzb3VyY2VGaWxlOiAndXNlci1wb29scy5kLnRzJ1xuICB9LFxuICAvLyBBbGFybSBUcmlnZ2Vyc1xuICB7XG4gICAgY2xhc3NOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJDdXN0b21UcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyLWN1c3RvbScsXG4gICAgcHJvcHNUeXBlOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJDdXN0b21UcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdBcHBsaWNhdGlvbkxvYWRCYWxhbmNlckN1c3RvbVRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybS1tZXRyaWNzLmQudHMnLFxuICAgIGpzZG9jOlxuICAgICAgJ1RyaWdnZXJzIGFuIGFsYXJtIGJhc2VkIG9uIGFueSBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyIENsb3VkV2F0Y2ggbWV0cmljIChlLmcuLCBjb25uZWN0aW9uIGNvdW50cywgcmVxdWVzdCBjb3VudHMsIHRhcmdldCByZXNwb25zZSB0aW1lcykuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJFcnJvclJhdGVUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdhcHBsaWNhdGlvbi1sb2FkLWJhbGFuY2VyLWVycm9yLXJhdGUnLFxuICAgIHByb3BzVHlwZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyRXJyb3JSYXRlVHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJFcnJvclJhdGVUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOlxuICAgICAgJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gdGhlIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXIgZXJyb3IgcmF0ZSAocGVyY2VudGFnZSBvZiA0eHgvNXh4IHJlc3BvbnNlcykgZXhjZWVkcyB0aGUgdGhyZXNob2xkLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyVW5oZWFsdGh5VGFyZ2V0c1RyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2FwcGxpY2F0aW9uLWxvYWQtYmFsYW5jZXItdW5oZWFsdGh5LXRhcmdldHMnLFxuICAgIHByb3BzVHlwZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyVW5oZWFsdGh5VGFyZ2V0c1RyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0FwcGxpY2F0aW9uTG9hZEJhbGFuY2VyVW5oZWFsdGh5VGFyZ2V0c1RyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6XG4gICAgICAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiB0aGUgcGVyY2VudGFnZSBvZiB1bmhlYWx0aHkgdGFyZ2V0cyBiZWhpbmQgdGhlIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXIgZXhjZWVkcyB0aGUgdGhyZXNob2xkLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ0h0dHBBcGlHYXRld2F5RXJyb3JSYXRlVHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnaHR0cC1hcGktZ2F0ZXdheS1lcnJvci1yYXRlJyxcbiAgICBwcm9wc1R5cGU6ICdIdHRwQXBpR2F0ZXdheUVycm9yUmF0ZVRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0h0dHBBcGlHYXRld2F5RXJyb3JSYXRlVHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzpcbiAgICAgICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIHRoZSBIVFRQIEFQSSBHYXRld2F5IGVycm9yIHJhdGUgKHBlcmNlbnRhZ2Ugb2YgNHh4LzV4eCByZXNwb25zZXMpIGV4Y2VlZHMgdGhlIHRocmVzaG9sZC4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdIdHRwQXBpR2F0ZXdheUxhdGVuY3lUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdodHRwLWFwaS1nYXRld2F5LWxhdGVuY3knLFxuICAgIHByb3BzVHlwZTogJ0h0dHBBcGlHYXRld2F5TGF0ZW5jeVRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0h0dHBBcGlHYXRld2F5TGF0ZW5jeVRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6XG4gICAgICAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiBIVFRQIEFQSSBHYXRld2F5IGxhdGVuY3kgZXhjZWVkcyB0aGUgdGhyZXNob2xkLiBMYXRlbmN5IGlzIG1lYXN1cmVkIGZyb20gcmVxdWVzdCByZWNlaXB0IHRvIHJlc3BvbnNlIHNlbnQuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlUmVhZExhdGVuY3lUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdkYXRhYmFzZS1yZWFkLWxhdGVuY3knLFxuICAgIHByb3BzVHlwZTogJ1JlbGF0aW9uYWxEYXRhYmFzZVJlYWRMYXRlbmN5VHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlUmVhZExhdGVuY3lUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOiAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiBkYXRhYmFzZSByZWFkIGxhdGVuY3kgKGF2ZXJhZ2UgdGltZSBmb3IgcmVhZCBJL08gb3BlcmF0aW9ucykgZXhjZWVkcyB0aGUgdGhyZXNob2xkLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZVdyaXRlTGF0ZW5jeVRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2RhdGFiYXNlLXdyaXRlLWxhdGVuY3knLFxuICAgIHByb3BzVHlwZTogJ1JlbGF0aW9uYWxEYXRhYmFzZVdyaXRlTGF0ZW5jeVRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZVdyaXRlTGF0ZW5jeVRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6XG4gICAgICAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiBkYXRhYmFzZSB3cml0ZSBsYXRlbmN5IChhdmVyYWdlIHRpbWUgZm9yIHdyaXRlIEkvTyBvcGVyYXRpb25zKSBleGNlZWRzIHRoZSB0aHJlc2hvbGQuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlQ1BVVXRpbGl6YXRpb25UcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdkYXRhYmFzZS1jcHUtdXRpbGl6YXRpb24nLFxuICAgIHByb3BzVHlwZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUNQVVV0aWxpemF0aW9uVHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlQ1BVVXRpbGl6YXRpb25UcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOiAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiBkYXRhYmFzZSBDUFUgdXRpbGl6YXRpb24gZXhjZWVkcyB0aGUgdGhyZXNob2xkIHBlcmNlbnRhZ2UuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlRnJlZVN0b3JhZ2VUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdkYXRhYmFzZS1mcmVlLXN0b3JhZ2UnLFxuICAgIHByb3BzVHlwZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUZyZWVTdG9yYWdlVHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlRnJlZVN0b3JhZ2VUcmlnZ2VyJyxcbiAgICBzb3VyY2VGaWxlOiAnYWxhcm1zLmQudHMnLFxuICAgIGpzZG9jOiAnVHJpZ2dlcnMgYW4gYWxhcm0gd2hlbiBhdmFpbGFibGUgZGF0YWJhc2Ugc3RvcmFnZSBmYWxscyBiZWxvdyB0aGUgdGhyZXNob2xkIChpbiBNQikuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlRnJlZU1lbW9yeVRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2RhdGFiYXNlLWZyZWUtbWVtb3J5JyxcbiAgICBwcm9wc1R5cGU6ICdSZWxhdGlvbmFsRGF0YWJhc2VGcmVlTWVtb3J5VHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnUmVsYXRpb25hbERhdGFiYXNlRnJlZU1lbW9yeVRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6ICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIGF2YWlsYWJsZSBkYXRhYmFzZSBtZW1vcnkgZmFsbHMgYmVsb3cgdGhlIHRocmVzaG9sZCAoaW4gTUIpLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUNvbm5lY3Rpb25Db3VudFRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2RhdGFiYXNlLWNvbm5lY3Rpb24tY291bnQnLFxuICAgIHByb3BzVHlwZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUNvbm5lY3Rpb25Db3VudFRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1JlbGF0aW9uYWxEYXRhYmFzZUNvbm5lY3Rpb25Db3VudFRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6ICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIHRoZSBudW1iZXIgb2YgZGF0YWJhc2UgY29ubmVjdGlvbnMgZXhjZWVkcyB0aGUgdGhyZXNob2xkLidcbiAgfSxcbiAge1xuICAgIGNsYXNzTmFtZTogJ1Nxc1F1ZXVlUmVjZWl2ZWRNZXNzYWdlc0NvdW50VHJpZ2dlcicsXG4gICAgdHlwZVZhbHVlOiAnc3FzLXF1ZXVlLXJlY2VpdmVkLW1lc3NhZ2VzLWNvdW50JyxcbiAgICBwcm9wc1R5cGU6ICdTcXNRdWV1ZVJlY2VpdmVkTWVzc2FnZXNDb3VudFRyaWdnZXJQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ1Nxc1F1ZXVlUmVjZWl2ZWRNZXNzYWdlc0NvdW50VHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzogJ1RyaWdnZXJzIGFuIGFsYXJtIHdoZW4gdGhlIG51bWJlciBvZiBtZXNzYWdlcyByZWNlaXZlZCBmcm9tIGFuIFNRUyBxdWV1ZSBjcm9zc2VzIHRoZSB0aHJlc2hvbGQuJ1xuICB9LFxuICB7XG4gICAgY2xhc3NOYW1lOiAnU3FzUXVldWVOb3RFbXB0eVRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ3Nxcy1xdWV1ZS1ub3QtZW1wdHknLFxuICAgIHByb3BzVHlwZTogJ1Nxc1F1ZXVlTm90RW1wdHlUcmlnZ2VyJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnU3FzUXVldWVOb3RFbXB0eVRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAgdHlwZU9ubHk6IHRydWUsXG4gICAganNkb2M6ICdUcmlnZ2VycyBhbiBhbGFybSBpZiB0aGUgU1FTIHF1ZXVlIGlzIG5vdCBlbXB0eS4gVXNlZnVsIGZvciBtb25pdG9yaW5nIGRlYWQtbGV0dGVyIHF1ZXVlcy4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdMYW1iZGFFcnJvclJhdGVUcmlnZ2VyJyxcbiAgICB0eXBlVmFsdWU6ICdsYW1iZGEtZXJyb3ItcmF0ZScsXG4gICAgcHJvcHNUeXBlOiAnTGFtYmRhRXJyb3JSYXRlVHJpZ2dlclByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnTGFtYmRhRXJyb3JSYXRlVHJpZ2dlcicsXG4gICAgc291cmNlRmlsZTogJ2FsYXJtcy5kLnRzJyxcbiAgICBqc2RvYzpcbiAgICAgICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIHRoZSBMYW1iZGEgZnVuY3Rpb24gZXJyb3IgcmF0ZSAocGVyY2VudGFnZSBvZiBmYWlsZWQgaW52b2NhdGlvbnMpIGV4Y2VlZHMgdGhlIHRocmVzaG9sZC4nXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdMYW1iZGFEdXJhdGlvblRyaWdnZXInLFxuICAgIHR5cGVWYWx1ZTogJ2xhbWJkYS1kdXJhdGlvbicsXG4gICAgcHJvcHNUeXBlOiAnTGFtYmRhRHVyYXRpb25UcmlnZ2VyUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdMYW1iZGFEdXJhdGlvblRyaWdnZXInLFxuICAgIHNvdXJjZUZpbGU6ICdhbGFybXMuZC50cycsXG4gICAganNkb2M6ICdUcmlnZ2VycyBhbiBhbGFybSB3aGVuIExhbWJkYSBmdW5jdGlvbiBleGVjdXRpb24gZHVyYXRpb24gZXhjZWVkcyB0aGUgdGhyZXNob2xkIChpbiBtaWxsaXNlY29uZHMpLidcbiAgfSxcbiAgLy8gQ3VzdG9tIFJlc291cmNlc1xuICB7XG4gICAgY2xhc3NOYW1lOiAnQ3VzdG9tUmVzb3VyY2VEZWZpbml0aW9uJyxcbiAgICB0eXBlVmFsdWU6ICdjdXN0b20tcmVzb3VyY2UtZGVmaW5pdGlvbicsXG4gICAgcHJvcHNUeXBlOiAnQ3VzdG9tUmVzb3VyY2VEZWZpbml0aW9uUHJvcHMnLFxuICAgIGludGVyZmFjZU5hbWU6ICdDdXN0b21SZXNvdXJjZURlZmluaXRpb24nLFxuICAgIHNvdXJjZUZpbGU6ICdjdXN0b20tcmVzb3VyY2VzLmQudHMnXG4gIH0sXG4gIHtcbiAgICBjbGFzc05hbWU6ICdDdXN0b21SZXNvdXJjZUluc3RhbmNlJyxcbiAgICB0eXBlVmFsdWU6ICdjdXN0b20tcmVzb3VyY2UtaW5zdGFuY2UnLFxuICAgIHByb3BzVHlwZTogJ0N1c3RvbVJlc291cmNlSW5zdGFuY2VQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0N1c3RvbVJlc291cmNlSW5zdGFuY2UnLFxuICAgIHNvdXJjZUZpbGU6ICdjdXN0b20tcmVzb3VyY2VzLmQudHMnXG4gIH0sXG4gIC8vIERlcGxveW1lbnQgU2NyaXB0c1xuICB7XG4gICAgY2xhc3NOYW1lOiAnRGVwbG95bWVudFNjcmlwdCcsXG4gICAgdHlwZVZhbHVlOiAnZGVwbG95bWVudC1zY3JpcHQnLFxuICAgIHByb3BzVHlwZTogJ0RlcGxveW1lbnRTY3JpcHRQcm9wcycsXG4gICAgaW50ZXJmYWNlTmFtZTogJ0RlcGxveW1lbnRTY3JpcHQnLFxuICAgIHNvdXJjZUZpbGU6ICdkZXBsb3ltZW50LXNjcmlwdC5kLnRzJ1xuICB9LFxuICAvLyBFZGdlIExhbWJkYSBGdW5jdGlvbnNcbiAge1xuICAgIGNsYXNzTmFtZTogJ0VkZ2VMYW1iZGFGdW5jdGlvbicsXG4gICAgdHlwZVZhbHVlOiAnZWRnZS1sYW1iZGEtZnVuY3Rpb24nLFxuICAgIHByb3BzVHlwZTogJ0VkZ2VMYW1iZGFGdW5jdGlvblByb3BzJyxcbiAgICBpbnRlcmZhY2VOYW1lOiAnRWRnZUxhbWJkYUZ1bmN0aW9uJyxcbiAgICBzb3VyY2VGaWxlOiAnZWRnZS1sYW1iZGEtZnVuY3Rpb25zLmQudHMnXG4gIH1cbl07XG5cbi8vID09PT09PT09PT09PT09PT09PT09IEhFTFBFUiBGVU5DVElPTlMgPT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJlc291cmNlQnlDbGFzc05hbWUoY2xhc3NOYW1lOiBzdHJpbmcpOiBSZXNvdXJjZURlZmluaXRpb24gfCB1bmRlZmluZWQge1xuICByZXR1cm4gUkVTT1VSQ0VTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMuZmluZCgocikgPT4gci5jbGFzc05hbWUgPT09IGNsYXNzTmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSZXNvdXJjZUJ5VHlwZShyZXNvdXJjZVR5cGU6IHN0cmluZyk6IFJlc291cmNlRGVmaW5pdGlvbiB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiBSRVNPVVJDRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUy5maW5kKChyKSA9PiByLnJlc291cmNlVHlwZSA9PT0gcmVzb3VyY2VUeXBlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJlc291cmNlc1dpdGhBdWdtZW50ZWRQcm9wcygpOiBSZXNvdXJjZURlZmluaXRpb25bXSB7XG4gIHJldHVybiBSRVNPVVJDRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUy5maWx0ZXIoKHIpID0+IHIuaGFzQXVnbWVudGVkUHJvcHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVzb3VyY2VzV2l0aE92ZXJyaWRlcygpOiBSZXNvdXJjZURlZmluaXRpb25bXSB7XG4gIHJldHVybiBSRVNPVVJDRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUy5maWx0ZXIoKHIpID0+IHIuc3VwcG9ydHNPdmVycmlkZXMgIT09IGZhbHNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFR5cGVQcm9wZXJ0aWVzQnlDbGFzc05hbWUoY2xhc3NOYW1lOiBzdHJpbmcpOiBUeXBlUHJvcGVydGllc0RlZmluaXRpb24gfCB1bmRlZmluZWQge1xuICByZXR1cm4gTUlTQ19UWVBFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLmZpbmQoKHQpID0+IHQuY2xhc3NOYW1lID09PSBjbGFzc05hbWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZVByb3BlcnRpZXNCeVR5cGVWYWx1ZSh0eXBlVmFsdWU6IHN0cmluZyk6IFR5cGVQcm9wZXJ0aWVzRGVmaW5pdGlvbiB8IHVuZGVmaW5lZCB7XG4gIHJldHVybiBNSVNDX1RZUEVTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMuZmluZCgodCkgPT4gdC50eXBlVmFsdWUgPT09IHR5cGVWYWx1ZSk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09IERFUklWRUQgTUFQUElOR1MgPT09PT09PT09PT09PT09PT09PT1cblxuLyoqIFJlc291cmNlIHR5cGUg4oaSIGNsYXNzIG5hbWUgbWFwcGluZyAqL1xuZXhwb3J0IGNvbnN0IFJFU09VUkNFX1RZUEVfVE9fQ0xBU1M6IFJlY29yZDxzdHJpbmcsIFJlc291cmNlQ2xhc3NOYW1lPiA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgUkVTT1VSQ0VTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMubWFwKChyKSA9PiBbci5yZXNvdXJjZVR5cGUsIHIuY2xhc3NOYW1lXSlcbik7XG5cbi8qKiBTY3JpcHQgdHlwZSDihpIgY2xhc3MgbmFtZSBtYXBwaW5nICovXG5leHBvcnQgY29uc3QgU0NSSVBUX1RZUEVfVE9fQ0xBU1M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gIE1JU0NfVFlQRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUy5maWx0ZXIoXG4gICAgKHQpID0+IHQuc291cmNlRmlsZSA9PT0gJ19faGVscGVycy5kLnRzJyAmJiB0LnByb3BzVHlwZS5pbmNsdWRlcygnU2NyaXB0JylcbiAgKS5tYXAoKHQpID0+IFt0LnR5cGVWYWx1ZSwgdC5jbGFzc05hbWVdKVxuKTtcblxuLyoqIFBhY2thZ2luZyB0eXBlIOKGkiBjbGFzcyBuYW1lIG1hcHBpbmcgKi9cbmV4cG9ydCBjb25zdCBQQUNLQUdJTkdfVFlQRV9UT19DTEFTUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgTUlTQ19UWVBFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTLmZpbHRlcigodCkgPT4gdC5zb3VyY2VGaWxlID09PSAnZGVwbG95bWVudC1hcnRpZmFjdHMuZC50cycpLm1hcCgodCkgPT4gW1xuICAgIHQudHlwZVZhbHVlLFxuICAgIHQuY2xhc3NOYW1lXG4gIF0pXG4pO1xuXG4vKiogRW5naW5lIHR5cGUg4oaSIGNsYXNzIG5hbWUgbWFwcGluZyAqL1xuZXhwb3J0IGNvbnN0IEVOR0lORV9UWVBFX1RPX0NMQVNTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuICBNSVNDX1RZUEVTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMuZmlsdGVyKCh0KSA9PiB0LnByb3BzVHlwZS5pbmNsdWRlcygnRW5naW5lJykpLm1hcCgodCkgPT4gW3QudHlwZVZhbHVlLCB0LmNsYXNzTmFtZV0pXG4pO1xuIiwKICAgICIvLyBSZS1leHBvcnQgZnJvbSBjbGFzcy1jb25maWcgKHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGgpXG5leHBvcnQge1xuICBnZXRSZXNvdXJjZUJ5Q2xhc3NOYW1lLFxuICBnZXRSZXNvdXJjZUJ5VHlwZSxcbiAgZ2V0UmVzb3VyY2VzV2l0aEF1Z21lbnRlZFByb3BzLFxuICBnZXRSZXNvdXJjZXNXaXRoT3ZlcnJpZGVzLFxuICBnZXRUeXBlUHJvcGVydGllc0J5Q2xhc3NOYW1lLFxuICBnZXRUeXBlUHJvcGVydGllc0J5VHlwZVZhbHVlLFxuICBNSVNDX1RZUEVTX0NPTlZFUlRJQkxFX1RPX0NMQVNTRVMsXG4gIHR5cGUgUmVzb3VyY2VEZWZpbml0aW9uLFxuICBSRVNPVVJDRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUyxcbiAgdHlwZSBUeXBlUHJvcGVydGllc0RlZmluaXRpb25cbn0gZnJvbSAnLi9jbGFzcy1jb25maWcnO1xuXG4vLyBUaGVzZSBjYW4gYmUgcmVmZXJlbmNlZCB1c2luZyAkUmVzb3VyY2VQYXJhbSBkaXJlY3RpdmVcbmV4cG9ydCBjb25zdCBSRUZFUkVOQ0VBQkxFX1BBUkFNUzogUmVjb3JkPHN0cmluZywgQXJyYXk8eyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uOiBzdHJpbmcgfT4+ID0ge1xuICAncmVsYXRpb25hbC1kYXRhYmFzZSc6IFtcbiAgICB7IG5hbWU6ICdjb25uZWN0aW9uU3RyaW5nJywgZGVzY3JpcHRpb246ICdDb25uZWN0aW9uIHN0cmluZyBmb3IgdGhlIGRhdGFiYXNlJyB9LFxuICAgIHsgbmFtZTogJ2pkYmNDb25uZWN0aW9uU3RyaW5nJywgZGVzY3JpcHRpb246ICdKREJDIGNvbm5lY3Rpb24gc3RyaW5nJyB9LFxuICAgIHsgbmFtZTogJ2hvc3QnLCBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIGhvc3QnIH0sXG4gICAgeyBuYW1lOiAncG9ydCcsIGRlc2NyaXB0aW9uOiAnRGF0YWJhc2UgcG9ydCcgfSxcbiAgICB7IG5hbWU6ICdkYk5hbWUnLCBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIG5hbWUnIH0sXG4gICAgeyBuYW1lOiAncmVhZGVySG9zdCcsIGRlc2NyaXB0aW9uOiAnUmVhZGVyIGVuZHBvaW50IGhvc3QnIH0sXG4gICAgeyBuYW1lOiAncmVhZGVyQ29ubmVjdGlvblN0cmluZycsIGRlc2NyaXB0aW9uOiAnUmVhZGVyIGNvbm5lY3Rpb24gc3RyaW5nJyB9LFxuICAgIHsgbmFtZTogJ3JlYWRlckpkYmNDb25uZWN0aW9uU3RyaW5nJywgZGVzY3JpcHRpb246ICdSZWFkZXIgSkRCQyBjb25uZWN0aW9uIHN0cmluZycgfVxuICBdLFxuICAnd2ViLXNlcnZpY2UnOiBbXG4gICAgeyBuYW1lOiAnZG9tYWluJywgZGVzY3JpcHRpb246ICdXZWIgc2VydmljZSBkb21haW4nIH0sXG4gICAgeyBuYW1lOiAndXJsJywgZGVzY3JpcHRpb246ICdXZWIgc2VydmljZSBVUkwnIH0sXG4gICAgeyBuYW1lOiAnY3VzdG9tRG9tYWlucycsIGRlc2NyaXB0aW9uOiAnQ3VzdG9tIGRvbWFpbnMnIH0sXG4gICAgeyBuYW1lOiAnY3VzdG9tRG9tYWluVXJscycsIGRlc2NyaXB0aW9uOiAnQ3VzdG9tIGRvbWFpbiBVUkxzJyB9XG4gIF0sXG4gICdwcml2YXRlLXNlcnZpY2UnOiBbeyBuYW1lOiAnYWRkcmVzcycsIGRlc2NyaXB0aW9uOiAnUHJpdmF0ZSBzZXJ2aWNlIGFkZHJlc3MnIH1dLFxuICBidWNrZXQ6IFtcbiAgICB7IG5hbWU6ICduYW1lJywgZGVzY3JpcHRpb246ICdCdWNrZXQgbmFtZScgfSxcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ0J1Y2tldCBBUk4nIH1cbiAgXSxcbiAgJ2R5bmFtby1kYi10YWJsZSc6IFtcbiAgICB7IG5hbWU6ICduYW1lJywgZGVzY3JpcHRpb246ICdUYWJsZSBuYW1lJyB9LFxuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnVGFibGUgQVJOJyB9LFxuICAgIHsgbmFtZTogJ3N0cmVhbUFybicsIGRlc2NyaXB0aW9uOiAnU3RyZWFtIEFSTicgfVxuICBdLFxuICBmdW5jdGlvbjogW1xuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnRnVuY3Rpb24gQVJOJyB9LFxuICAgIHsgbmFtZTogJ2xvZ0dyb3VwQXJuJywgZGVzY3JpcHRpb246ICdMb2cgZ3JvdXAgQVJOJyB9XG4gIF0sXG4gICdiYXRjaC1qb2InOiBbXG4gICAgeyBuYW1lOiAnam9iRGVmaW5pdGlvbkFybicsIGRlc2NyaXB0aW9uOiAnSm9iIGRlZmluaXRpb24gQVJOJyB9LFxuICAgIHsgbmFtZTogJ3N0YXRlTWFjaGluZUFybicsIGRlc2NyaXB0aW9uOiAnU3RhdGUgbWFjaGluZSBBUk4nIH0sXG4gICAgeyBuYW1lOiAnbG9nR3JvdXBBcm4nLCBkZXNjcmlwdGlvbjogJ0xvZyBncm91cCBBUk4nIH1cbiAgXSxcbiAgJ2V2ZW50LWJ1cyc6IFtcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ0V2ZW50IGJ1cyBBUk4nIH0sXG4gICAgeyBuYW1lOiAnYXJjaGl2ZUFybicsIGRlc2NyaXB0aW9uOiAnQXJjaGl2ZSBBUk4nIH1cbiAgXSxcbiAgJ2h0dHAtYXBpLWdhdGV3YXknOiBbXG4gICAgeyBuYW1lOiAnZG9tYWluJywgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBkb21haW4nIH0sXG4gICAgeyBuYW1lOiAndXJsJywgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBVUkwnIH0sXG4gICAgeyBuYW1lOiAnY3VzdG9tRG9tYWlucycsIGRlc2NyaXB0aW9uOiAnQ3VzdG9tIGRvbWFpbnMnIH0sXG4gICAgeyBuYW1lOiAnY3VzdG9tRG9tYWluVXJscycsIGRlc2NyaXB0aW9uOiAnQ3VzdG9tIGRvbWFpbiBVUkxzJyB9LFxuICAgIHsgbmFtZTogJ2N1c3RvbURvbWFpblVybCcsIGRlc2NyaXB0aW9uOiAnRmlyc3QgY3VzdG9tIGRvbWFpbiBVUkwnIH1cbiAgXSxcbiAgJ21vbmdvLWRiLWF0bGFzLWNsdXN0ZXInOiBbeyBuYW1lOiAnY29ubmVjdGlvblN0cmluZycsIGRlc2NyaXB0aW9uOiAnTW9uZ29EQiBjb25uZWN0aW9uIHN0cmluZycgfV0sXG4gICdyZWRpcy1jbHVzdGVyJzogW1xuICAgIHsgbmFtZTogJ2hvc3QnLCBkZXNjcmlwdGlvbjogJ1JlZGlzIGhvc3QnIH0sXG4gICAgeyBuYW1lOiAncmVhZGVySG9zdCcsIGRlc2NyaXB0aW9uOiAnUmVkaXMgcmVhZGVyIGhvc3QnIH0sXG4gICAgeyBuYW1lOiAncG9ydCcsIGRlc2NyaXB0aW9uOiAnUmVkaXMgcG9ydCcgfSxcbiAgICB7IG5hbWU6ICdzaGFyZGluZycsIGRlc2NyaXB0aW9uOiAnU2hhcmRpbmcgc3RhdHVzJyB9XG4gIF0sXG4gICdzdGF0ZS1tYWNoaW5lJzogW1xuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnU3RhdGUgbWFjaGluZSBBUk4nIH0sXG4gICAgeyBuYW1lOiAnbmFtZScsIGRlc2NyaXB0aW9uOiAnU3RhdGUgbWFjaGluZSBuYW1lJyB9XG4gIF0sXG4gICd1c2VyLWF1dGgtcG9vbCc6IFtcbiAgICB7IG5hbWU6ICdpZCcsIGRlc2NyaXB0aW9uOiAnVXNlciBwb29sIElEJyB9LFxuICAgIHsgbmFtZTogJ2NsaWVudElkJywgZGVzY3JpcHRpb246ICdDbGllbnQgSUQnIH0sXG4gICAgeyBuYW1lOiAnZG9tYWluJywgZGVzY3JpcHRpb246ICdVc2VyIHBvb2wgZG9tYWluJyB9XG4gIF0sXG4gICd1cHN0YXNoLXJlZGlzJzogW1xuICAgIHsgbmFtZTogJ2hvc3QnLCBkZXNjcmlwdGlvbjogJ1Vwc3Rhc2ggUmVkaXMgaG9zdCcgfSxcbiAgICB7IG5hbWU6ICdwb3J0JywgZGVzY3JpcHRpb246ICdVcHN0YXNoIFJlZGlzIHBvcnQnIH0sXG4gICAgeyBuYW1lOiAncGFzc3dvcmQnLCBkZXNjcmlwdGlvbjogJ1Bhc3N3b3JkJyB9LFxuICAgIHsgbmFtZTogJ3Jlc3RUb2tlbicsIGRlc2NyaXB0aW9uOiAnUkVTVCB0b2tlbicgfSxcbiAgICB7IG5hbWU6ICdyZWFkT25seVJlc3RUb2tlbicsIGRlc2NyaXB0aW9uOiAnUmVhZC1vbmx5IFJFU1QgdG9rZW4nIH0sXG4gICAgeyBuYW1lOiAncmVzdFVybCcsIGRlc2NyaXB0aW9uOiAnUkVTVCBVUkwnIH0sXG4gICAgeyBuYW1lOiAncmVkaXNVcmwnLCBkZXNjcmlwdGlvbjogJ1JlZGlzIFVSTCcgfVxuICBdLFxuICAnYXBwbGljYXRpb24tbG9hZC1iYWxhbmNlcic6IFtcbiAgICB7IG5hbWU6ICdkb21haW4nLCBkZXNjcmlwdGlvbjogJ0xvYWQgYmFsYW5jZXIgZG9tYWluJyB9LFxuICAgIHsgbmFtZTogJ2N1c3RvbURvbWFpbnMnLCBkZXNjcmlwdGlvbjogJ0N1c3RvbSBkb21haW5zJyB9XG4gIF0sXG4gICduZXR3b3JrLWxvYWQtYmFsYW5jZXInOiBbXG4gICAgeyBuYW1lOiAnZG9tYWluJywgZGVzY3JpcHRpb246ICdMb2FkIGJhbGFuY2VyIGRvbWFpbicgfSxcbiAgICB7IG5hbWU6ICdjdXN0b21Eb21haW5zJywgZGVzY3JpcHRpb246ICdDdXN0b20gZG9tYWlucycgfVxuICBdLFxuICAnaG9zdGluZy1idWNrZXQnOiBbXG4gICAgeyBuYW1lOiAnbmFtZScsIGRlc2NyaXB0aW9uOiAnQnVja2V0IG5hbWUnIH0sXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdCdWNrZXQgQVJOJyB9XG4gIF0sXG4gICd3ZWItYXBwLWZpcmV3YWxsJzogW1xuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnRmlyZXdhbGwgQVJOJyB9LFxuICAgIHsgbmFtZTogJ3Njb3BlJywgZGVzY3JpcHRpb246ICdGaXJld2FsbCBzY29wZScgfVxuICBdLFxuICAnb3Blbi1zZWFyY2gtZG9tYWluJzogW1xuICAgIHsgbmFtZTogJ2RvbWFpbkVuZHBvaW50JywgZGVzY3JpcHRpb246ICdPcGVuU2VhcmNoIGRvbWFpbiBlbmRwb2ludCcgfSxcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ0RvbWFpbiBBUk4nIH1cbiAgXSxcbiAgJ2Vmcy1maWxlc3lzdGVtJzogW1xuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnRUZTIEFSTicgfSxcbiAgICB7IG5hbWU6ICdpZCcsIGRlc2NyaXB0aW9uOiAnRUZTIElEJyB9XG4gIF0sXG4gICduZXh0anMtd2ViJzogW3sgbmFtZTogJ3VybCcsIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnIH1dLFxuICAnYXN0cm8td2ViJzogW3sgbmFtZTogJ3VybCcsIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnIH1dLFxuICAnbnV4dC13ZWInOiBbeyBuYW1lOiAndXJsJywgZGVzY3JpcHRpb246ICdXZWJzaXRlIFVSTCcgfV0sXG4gICdzdmVsdGVraXQtd2ViJzogW3sgbmFtZTogJ3VybCcsIGRlc2NyaXB0aW9uOiAnV2Vic2l0ZSBVUkwnIH1dLFxuICAnc29saWRzdGFydC13ZWInOiBbeyBuYW1lOiAndXJsJywgZGVzY3JpcHRpb246ICdXZWJzaXRlIFVSTCcgfV0sXG4gICd0YW5zdGFjay13ZWInOiBbeyBuYW1lOiAndXJsJywgZGVzY3JpcHRpb246ICdXZWJzaXRlIFVSTCcgfV0sXG4gICdyZW1peC13ZWInOiBbeyBuYW1lOiAndXJsJywgZGVzY3JpcHRpb246ICdXZWJzaXRlIFVSTCcgfV0sXG4gICdtdWx0aS1jb250YWluZXItd29ya2xvYWQnOiBbeyBuYW1lOiAnbG9nR3JvdXBBcm4nLCBkZXNjcmlwdGlvbjogJ0xvZyBncm91cCBBUk4nIH1dLFxuICAnc3FzLXF1ZXVlJzogW1xuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnUXVldWUgQVJOJyB9LFxuICAgIHsgbmFtZTogJ3VybCcsIGRlc2NyaXB0aW9uOiAnUXVldWUgVVJMJyB9LFxuICAgIHsgbmFtZTogJ25hbWUnLCBkZXNjcmlwdGlvbjogJ1F1ZXVlIG5hbWUnIH1cbiAgXSxcbiAgJ3Nucy10b3BpYyc6IFtcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ1RvcGljIEFSTicgfSxcbiAgICB7IG5hbWU6ICduYW1lJywgZGVzY3JpcHRpb246ICdUb3BpYyBuYW1lJyB9XG4gIF0sXG4gICdhZ2VudGNvcmUtcnVudGltZSc6IFtcbiAgICB7IG5hbWU6ICdpZCcsIGRlc2NyaXB0aW9uOiAnQWdlbnRDb3JlIHJ1bnRpbWUgSUQnIH0sXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdBZ2VudENvcmUgcnVudGltZSBBUk4nIH0sXG4gICAgeyBuYW1lOiAnZW5kcG9pbnROYW1lJywgZGVzY3JpcHRpb246ICdEZWZhdWx0IHJ1bnRpbWUgZW5kcG9pbnQgbmFtZScgfSxcbiAgICB7IG5hbWU6ICdlbmRwb2ludEFybicsIGRlc2NyaXB0aW9uOiAnRGVmYXVsdCBydW50aW1lIGVuZHBvaW50IEFSTicgfVxuICBdLFxuICAnYWdlbnRjb3JlLW1lbW9yeSc6IFtcbiAgICB7IG5hbWU6ICdpZCcsIGRlc2NyaXB0aW9uOiAnQWdlbnRDb3JlIG1lbW9yeSBJRCcgfSxcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ0FnZW50Q29yZSBtZW1vcnkgQVJOJyB9XG4gIF0sXG4gICdhZ2VudGNvcmUtZ2F0ZXdheSc6IFtcbiAgICB7IG5hbWU6ICdpZCcsIGRlc2NyaXB0aW9uOiAnQWdlbnRDb3JlIGdhdGV3YXkgSUQnIH0sXG4gICAgeyBuYW1lOiAnYXJuJywgZGVzY3JpcHRpb246ICdBZ2VudENvcmUgZ2F0ZXdheSBBUk4nIH0sXG4gICAgeyBuYW1lOiAndXJsJywgZGVzY3JpcHRpb246ICdBZ2VudENvcmUgZ2F0ZXdheSBVUkwnIH1cbiAgXSxcbiAgJ2FnZW50Y29yZS1icm93c2VyJzogW1xuICAgIHsgbmFtZTogJ2lkJywgZGVzY3JpcHRpb246ICdBZ2VudENvcmUgYnJvd3NlciBJRCcgfSxcbiAgICB7IG5hbWU6ICdhcm4nLCBkZXNjcmlwdGlvbjogJ0FnZW50Q29yZSBicm93c2VyIEFSTicgfVxuICBdLFxuICAnYWdlbnRjb3JlLWNvZGUtaW50ZXJwcmV0ZXInOiBbXG4gICAgeyBuYW1lOiAnaWQnLCBkZXNjcmlwdGlvbjogJ0FnZW50Q29yZSBjb2RlIGludGVycHJldGVyIElEJyB9LFxuICAgIHsgbmFtZTogJ2FybicsIGRlc2NyaXB0aW9uOiAnQWdlbnRDb3JlIGNvZGUgaW50ZXJwcmV0ZXIgQVJOJyB9XG4gIF1cbn07XG4iLAogICAgImltcG9ydCB0eXBlIHsgUmVzb3VyY2VDbGFzc05hbWUgfSBmcm9tICcuL2NsYXNzLWNvbmZpZyc7XG5pbXBvcnQgeyBSRVNPVVJDRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUyB9IGZyb20gJy4vY2xhc3MtY29uZmlnJztcbmltcG9ydCB7IEJhc2VSZXNvdXJjZSB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7IFJFRkVSRU5DRUFCTEVfUEFSQU1TIH0gZnJvbSAnLi9yZXNvdXJjZS1tZXRhZGF0YSc7XG5cbi8vIFByaXZhdGUgc3ltYm9sIGZvciBhY2Nlc3NpbmcgdGhlIGludGVybmFsIHBhcmFtIHJlZmVyZW5jZSBtZXRob2RcbmNvbnN0IGdldFBhcmFtUmVmZXJlbmNlU3ltYm9sID0gU3ltYm9sLmZvcignc3RhY2t0YXBlOmdldFBhcmFtUmVmZXJlbmNlJyk7XG5cbi8qKlxuICogRmFjdG9yeSBmdW5jdGlvbiB0byBjcmVhdGUgYSByZXNvdXJjZSBjbGFzcyB3aXRoIHJlZmVyZW5jZWFibGUgcGFyYW1ldGVycy5cbiAqIFN1cHBvcnRzIHR3byBjYWxsaW5nIGNvbnZlbnRpb25zOlxuICogLSBuZXcgUmVzb3VyY2UocHJvcGVydGllcykgLSBuYW1lIGRlcml2ZWQgZnJvbSBvYmplY3Qga2V5IGluIHJlc291cmNlc1xuICogLSBuZXcgUmVzb3VyY2UobmFtZSwgcHJvcGVydGllcykgLSBleHBsaWNpdCBuYW1lIChiYWNrd2FyZHMgY29tcGF0aWJsZSlcbiAqL1xuZnVuY3Rpb24gY3JlYXRlUmVzb3VyY2VDbGFzcyhjbGFzc05hbWU6IFJlc291cmNlQ2xhc3NOYW1lLCByZXNvdXJjZVR5cGU6IHN0cmluZyk6IGFueSB7XG4gIC8vIENyZWF0ZSB0aGUgY2xhc3MgZHluYW1pY2FsbHlcbiAgY29uc3QgUmVzb3VyY2VDbGFzcyA9IGNsYXNzIGV4dGVuZHMgQmFzZVJlc291cmNlIHtcbiAgICBjb25zdHJ1Y3RvcihuYW1lT3JQcm9wZXJ0aWVzOiBzdHJpbmcgfCBhbnksIHByb3BlcnRpZXM/OiBhbnkpIHtcbiAgICAgIGlmICh0eXBlb2YgbmFtZU9yUHJvcGVydGllcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8gT2xkIHN0eWxlOiAobmFtZSwgcHJvcGVydGllcykgLSBleHBsaWNpdCBuYW1lXG4gICAgICAgIHN1cGVyKG5hbWVPclByb3BlcnRpZXMsIHJlc291cmNlVHlwZSwgcHJvcGVydGllcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBOZXcgc3R5bGU6IChwcm9wZXJ0aWVzKSAtIG5hbWUgd2lsbCBiZSBzZXQgZnJvbSBvYmplY3Qga2V5XG4gICAgICAgIHN1cGVyKHVuZGVmaW5lZCwgcmVzb3VyY2VUeXBlLCBuYW1lT3JQcm9wZXJ0aWVzKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLy8gU2V0IHRoZSBjbGFzcyBuYW1lIGZvciBiZXR0ZXIgZGVidWdnaW5nXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShSZXNvdXJjZUNsYXNzLCAnbmFtZScsIHsgdmFsdWU6IGNsYXNzTmFtZSB9KTtcblxuICAvLyBBZGQgcmVmZXJlbmNlYWJsZSBwYXJhbWV0ZXIgZ2V0dGVyc1xuICBjb25zdCByZWZlcmVuY2VhYmxlUGFyYW1zID0gUkVGRVJFTkNFQUJMRV9QQVJBTVNbcmVzb3VyY2VUeXBlXSB8fCBbXTtcbiAgZm9yIChjb25zdCBwYXJhbSBvZiByZWZlcmVuY2VhYmxlUGFyYW1zKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFJlc291cmNlQ2xhc3MucHJvdG90eXBlLCBwYXJhbS5uYW1lLCB7XG4gICAgICBnZXQodGhpczogQmFzZVJlc291cmNlKSB7XG4gICAgICAgIHJldHVybiAodGhpcyBhcyBhbnkpW2dldFBhcmFtUmVmZXJlbmNlU3ltYm9sXShwYXJhbS5uYW1lKTtcbiAgICAgIH0sXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIFJlc291cmNlQ2xhc3M7XG59XG5cbi8vIENyZWF0ZSBhbGwgcmVzb3VyY2UgY2xhc3NlcyBmcm9tIGNvbmZpZ1xuY29uc3QgUkVTT1VSQ0VfQ0xBU1NFUzogUmVjb3JkPHN0cmluZywgUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlUmVzb3VyY2VDbGFzcz4+ID0ge307XG5mb3IgKGNvbnN0IGRlZiBvZiBSRVNPVVJDRVNfQ09OVkVSVElCTEVfVE9fQ0xBU1NFUykge1xuICAvLyBVc2UgJ0xhbWJkYUZ1bmN0aW9uJyBhcyB0aGUgZXhwb3J0ZWQgbmFtZSBmb3IgJ0Z1bmN0aW9uJyB0byBhdm9pZCBKUyByZXNlcnZlZCB3b3JkIGlzc3Vlc1xuICBSRVNPVVJDRV9DTEFTU0VTW2RlZi5jbGFzc05hbWUgYXMgYW55XSA9IGNyZWF0ZVJlc291cmNlQ2xhc3MoZGVmLmNsYXNzTmFtZSwgZGVmLnJlc291cmNlVHlwZSk7XG59XG5cbi8vIEV4cG9ydCBhbGwgcmVzb3VyY2UgY2xhc3NlcyBmb3IgbmFtZWQgaW1wb3J0c1xuZXhwb3J0IGNvbnN0IHtcbiAgUmVsYXRpb25hbERhdGFiYXNlLFxuICBXZWJTZXJ2aWNlLFxuICBQcml2YXRlU2VydmljZSxcbiAgV29ya2VyU2VydmljZSxcbiAgTXVsdGlDb250YWluZXJXb3JrbG9hZCxcbiAgTGFtYmRhRnVuY3Rpb24sXG4gIEJhdGNoSm9iLFxuICBCdWNrZXQsXG4gIEhvc3RpbmdCdWNrZXQsXG4gIER5bmFtb0RiVGFibGUsXG4gIEV2ZW50QnVzLFxuICBIdHRwQXBpR2F0ZXdheSxcbiAgQXBwbGljYXRpb25Mb2FkQmFsYW5jZXIsXG4gIE5ldHdvcmtMb2FkQmFsYW5jZXIsXG4gIFJlZGlzQ2x1c3RlcixcbiAgTW9uZ29EYkF0bGFzQ2x1c3RlcixcbiAgU3RhdGVNYWNoaW5lLFxuICBVc2VyQXV0aFBvb2wsXG4gIFVwc3Rhc2hSZWRpcyxcbiAgU3FzUXVldWUsXG4gIFNuc1RvcGljLFxuICBLaW5lc2lzU3RyZWFtLFxuICBXZWJBcHBGaXJld2FsbCxcbiAgT3BlblNlYXJjaERvbWFpbixcbiAgRWZzRmlsZXN5c3RlbSxcbiAgTmV4dGpzV2ViLFxuICBCYXN0aW9uLFxuICBBZ2VudENvcmVSdW50aW1lLFxuICBBZ2VudENvcmVNZW1vcnksXG4gIEFnZW50Q29yZUdhdGV3YXksXG4gIEFnZW50Q29yZUJyb3dzZXIsXG4gIEFnZW50Q29yZUNvZGVJbnRlcnByZXRlcixcbiAgQXdzQ2RrQ29uc3RydWN0XG59ID0gUkVTT1VSQ0VfQ0xBU1NFUztcbiIsCiAgICAiaW1wb3J0IHsgTUlTQ19UWVBFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTIH0gZnJvbSAnLi9jbGFzcy1jb25maWcnO1xuaW1wb3J0IHsgQmFzZVR5cGVQcm9wZXJ0aWVzLCBCYXNlVHlwZU9ubHkgfSBmcm9tICcuL2NvbmZpZyc7XG5cbmZ1bmN0aW9uIGNyZWF0ZVR5cGVQcm9wZXJ0aWVzQ2xhc3MoY2xhc3NOYW1lOiBzdHJpbmcsIHR5cGVWYWx1ZTogc3RyaW5nLCB0eXBlT25seT86IGJvb2xlYW4pOiBhbnkge1xuICBpZiAodHlwZU9ubHkpIHtcbiAgICBjb25zdCBUeXBlT25seUNsYXNzID0gY2xhc3MgZXh0ZW5kcyBCYXNlVHlwZU9ubHkge1xuICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKHR5cGVWYWx1ZSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoVHlwZU9ubHlDbGFzcywgJ25hbWUnLCB7IHZhbHVlOiBjbGFzc05hbWUgfSk7XG4gICAgcmV0dXJuIFR5cGVPbmx5Q2xhc3M7XG4gIH1cblxuICBjb25zdCBUeXBlUHJvcGVydGllc0NsYXNzID0gY2xhc3MgZXh0ZW5kcyBCYXNlVHlwZVByb3BlcnRpZXMge1xuICAgIGNvbnN0cnVjdG9yKHByb3BlcnRpZXM6IGFueSkge1xuICAgICAgc3VwZXIodHlwZVZhbHVlLCBwcm9wZXJ0aWVzKTtcbiAgICB9XG4gIH07XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFR5cGVQcm9wZXJ0aWVzQ2xhc3MsICduYW1lJywgeyB2YWx1ZTogY2xhc3NOYW1lIH0pO1xuICByZXR1cm4gVHlwZVByb3BlcnRpZXNDbGFzcztcbn1cblxuLy8gQ3JlYXRlIGFsbCB0eXBlLXByb3BlcnRpZXMgY2xhc3NlcyBmcm9tIGNvbmZpZ1xuY29uc3QgVFlQRV9QUk9QRVJUSUVTX0NMQVNTRVM6IFJlY29yZDxzdHJpbmcsIFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZVR5cGVQcm9wZXJ0aWVzQ2xhc3M+PiA9IHt9O1xuZm9yIChjb25zdCBkZWYgb2YgTUlTQ19UWVBFU19DT05WRVJUSUJMRV9UT19DTEFTU0VTKSB7XG4gIFRZUEVfUFJPUEVSVElFU19DTEFTU0VTW2RlZi5jbGFzc05hbWVdID0gY3JlYXRlVHlwZVByb3BlcnRpZXNDbGFzcyhkZWYuY2xhc3NOYW1lLCBkZWYudHlwZVZhbHVlLCBkZWYudHlwZU9ubHkpO1xufVxuXG4vLyBFeHBvcnQgYWxsIGNsYXNzZXMgZm9yIG5hbWVkIGltcG9ydHMgKFR5cGVTY3JpcHQgbmVlZHMgdGhlc2UgZXhwbGljaXQgZXhwb3J0cylcbmV4cG9ydCBjb25zdCB7XG4gIC8vIERhdGFiYXNlIEVuZ2luZXNcbiAgUmRzRW5naW5lUG9zdGdyZXMsXG4gIFJkc0VuZ2luZU1hcmlhZGIsXG4gIFJkc0VuZ2luZU15c3FsLFxuICBSZHNFbmdpbmVPcmFjbGVFRSxcbiAgUmRzRW5naW5lT3JhY2xlU0UyLFxuICBSZHNFbmdpbmVTcWxTZXJ2ZXJFRSxcbiAgUmRzRW5naW5lU3FsU2VydmVyRVgsXG4gIFJkc0VuZ2luZVNxbFNlcnZlclNFLFxuICBSZHNFbmdpbmVTcWxTZXJ2ZXJXZWIsXG4gIEF1cm9yYUVuZ2luZVBvc3RncmVzcWwsXG4gIEF1cm9yYUVuZ2luZU15c3FsLFxuICBBdXJvcmFTZXJ2ZXJsZXNzRW5naW5lUG9zdGdyZXNxbCxcbiAgQXVyb3JhU2VydmVybGVzc0VuZ2luZU15c3FsLFxuICBBdXJvcmFTZXJ2ZXJsZXNzVjJFbmdpbmVQb3N0Z3Jlc3FsLFxuICBBdXJvcmFTZXJ2ZXJsZXNzVjJFbmdpbmVNeXNxbCxcbiAgLy8gTGFtYmRhIFBhY2thZ2luZ1xuICBTdGFja3RhcGVMYW1iZGFCdWlsZHBhY2tQYWNrYWdpbmcsXG4gIEN1c3RvbUFydGlmYWN0TGFtYmRhUGFja2FnaW5nLFxuICAvLyBDb250YWluZXIgUGFja2FnaW5nXG4gIFByZWJ1aWx0SW1hZ2VQYWNrYWdpbmcsXG4gIEN1c3RvbURvY2tlcmZpbGVQYWNrYWdpbmcsXG4gIEV4dGVybmFsQnVpbGRwYWNrUGFja2FnaW5nLFxuICBOaXhwYWNrc1BhY2thZ2luZyxcbiAgU3RhY2t0YXBlSW1hZ2VCdWlsZHBhY2tQYWNrYWdpbmcsXG4gIC8vIExhbWJkYSBGdW5jdGlvbiBFdmVudHMvSW50ZWdyYXRpb25zXG4gIEh0dHBBcGlJbnRlZ3JhdGlvbixcbiAgUzNJbnRlZ3JhdGlvbixcbiAgU2NoZWR1bGVJbnRlZ3JhdGlvbixcbiAgU25zSW50ZWdyYXRpb24sXG4gIFNxc0ludGVncmF0aW9uLFxuICBLaW5lc2lzSW50ZWdyYXRpb24sXG4gIER5bmFtb0RiSW50ZWdyYXRpb24sXG4gIENsb3Vkd2F0Y2hMb2dJbnRlZ3JhdGlvbixcbiAgQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJJbnRlZ3JhdGlvbixcbiAgRXZlbnRCdXNJbnRlZ3JhdGlvbixcbiAgS2Fma2FUb3BpY0ludGVncmF0aW9uLFxuICBBbGFybUludGVncmF0aW9uLFxuICBJb3RJbnRlZ3JhdGlvbixcbiAgLy8gQ0ROIFJvdXRlc1xuICBDZG5Mb2FkQmFsYW5jZXJSb3V0ZSxcbiAgQ2RuSHR0cEFwaUdhdGV3YXlSb3V0ZSxcbiAgQ2RuTGFtYmRhRnVuY3Rpb25Sb3V0ZSxcbiAgQ2RuQ3VzdG9tRG9tYWluUm91dGUsXG4gIENkbkJ1Y2tldFJvdXRlLFxuICAvLyBXZWIgQXBwIEZpcmV3YWxsIFJ1bGVzXG4gIE1hbmFnZWRSdWxlR3JvdXAsXG4gIEN1c3RvbVJ1bGVHcm91cCxcbiAgUmF0ZUJhc2VkUnVsZSxcbiAgLy8gU1FTIFF1ZXVlIEludGVncmF0aW9uc1xuICBTcXNRdWV1ZUV2ZW50QnVzSW50ZWdyYXRpb24sXG4gIC8vIE11bHRpIENvbnRhaW5lciBXb3JrbG9hZCBJbnRlZ3JhdGlvbnNcbiAgTXVsdGlDb250YWluZXJXb3JrbG9hZEh0dHBBcGlJbnRlZ3JhdGlvbixcbiAgTXVsdGlDb250YWluZXJXb3JrbG9hZExvYWRCYWxhbmNlckludGVncmF0aW9uLFxuICBNdWx0aUNvbnRhaW5lcldvcmtsb2FkTmV0d29ya0xvYWRCYWxhbmNlckludGVncmF0aW9uLFxuICBNdWx0aUNvbnRhaW5lcldvcmtsb2FkSW50ZXJuYWxJbnRlZ3JhdGlvbixcbiAgTXVsdGlDb250YWluZXJXb3JrbG9hZFNlcnZpY2VDb25uZWN0SW50ZWdyYXRpb24sXG4gIC8vIFNjcmlwdHNcbiAgTG9jYWxTY3JpcHQsXG4gIEJhc3Rpb25TY3JpcHQsXG4gIExvY2FsU2NyaXB0V2l0aEJhc3Rpb25UdW5uZWxpbmcsXG4gIC8vIExvZyBGb3J3YXJkaW5nXG4gIEh0dHBFbmRwb2ludExvZ0ZvcndhcmRpbmcsXG4gIEhpZ2hsaWdodExvZ0ZvcndhcmRpbmcsXG4gIERhdGFkb2dMb2dGb3J3YXJkaW5nLFxuICAvLyBCdWNrZXQgTGlmZWN5Y2xlIFJ1bGVzXG4gIEV4cGlyYXRpb25MaWZlY3ljbGVSdWxlLFxuICBOb25DdXJyZW50VmVyc2lvbkV4cGlyYXRpb25MaWZlY3ljbGVSdWxlLFxuICAvLyBWb2x1bWUgTW91bnRzXG4gIENvbnRhaW5lckVmc01vdW50LFxuICBMYW1iZGFFZnNNb3VudCxcbiAgTGFtYmRhUzNGaWxlc01vdW50LFxuICAvLyBBdXRob3JpemVyc1xuICBDb2duaXRvQXV0aG9yaXplcixcbiAgTGFtYmRhQXV0aG9yaXplcixcbiAgLy8gQWxhcm0gVHJpZ2dlcnNcbiAgQXBwbGljYXRpb25Mb2FkQmFsYW5jZXJDdXN0b21UcmlnZ2VyLFxuICBBcHBsaWNhdGlvbkxvYWRCYWxhbmNlckVycm9yUmF0ZVRyaWdnZXIsXG4gIEFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyVW5oZWFsdGh5VGFyZ2V0c1RyaWdnZXIsXG4gIEh0dHBBcGlHYXRld2F5RXJyb3JSYXRlVHJpZ2dlcixcbiAgSHR0cEFwaUdhdGV3YXlMYXRlbmN5VHJpZ2dlcixcbiAgUmVsYXRpb25hbERhdGFiYXNlUmVhZExhdGVuY3lUcmlnZ2VyLFxuICBSZWxhdGlvbmFsRGF0YWJhc2VXcml0ZUxhdGVuY3lUcmlnZ2VyLFxuICBSZWxhdGlvbmFsRGF0YWJhc2VDUFVVdGlsaXphdGlvblRyaWdnZXIsXG4gIFJlbGF0aW9uYWxEYXRhYmFzZUZyZWVTdG9yYWdlVHJpZ2dlcixcbiAgUmVsYXRpb25hbERhdGFiYXNlRnJlZU1lbW9yeVRyaWdnZXIsXG4gIFJlbGF0aW9uYWxEYXRhYmFzZUNvbm5lY3Rpb25Db3VudFRyaWdnZXIsXG4gIFNxc1F1ZXVlUmVjZWl2ZWRNZXNzYWdlc0NvdW50VHJpZ2dlcixcbiAgU3FzUXVldWVOb3RFbXB0eVRyaWdnZXIsXG4gIExhbWJkYUVycm9yUmF0ZVRyaWdnZXIsXG4gIExhbWJkYUR1cmF0aW9uVHJpZ2dlcixcbiAgLy8gQ3VzdG9tIFJlc291cmNlc1xuICBDdXN0b21SZXNvdXJjZURlZmluaXRpb24sXG4gIEN1c3RvbVJlc291cmNlSW5zdGFuY2UsXG4gIC8vIERlcGxveW1lbnQgU2NyaXB0c1xuICBEZXBsb3ltZW50U2NyaXB0LFxuICAvLyBFZGdlIExhbWJkYSBGdW5jdGlvbnNcbiAgRWRnZUxhbWJkYUZ1bmN0aW9uXG59ID0gVFlQRV9QUk9QRVJUSUVTX0NMQVNTRVM7XG4iCiAgXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsSUFBTSx1QkFBdUI7QUFDN0IsSUFBTSx1QkFBdUI7QUFFN0IsSUFBTSwyQkFBMkI7QUFFakMsSUFBTSx1QkFBdUI7QUFFN0IsSUFBTSxzQkFBc0I7QUFFNUIsSUFBTSxtQ0FBbUM7QUFJbEMsU0FBUyxLQUFLLENBQUMsT0FBTztBQUFBLEVBQ3pCLElBQUksU0FBUyxNQUFN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QztBQUFBLEVBQ2pCO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osbUJBQW1CO0FBQUEsSUFDbkIsY0FBYztBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osY0FBYztBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osbUJBQW1CO0FBQUEsSUFDbkIsY0FBYztBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osY0FBYztBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osY0FBYztBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osY0FBYztBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osY0FBYztBQUFBLE1BQ1o7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osY0FBYyxDQUFDO0FBQUEsRUFDakI7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixtQkFBbUI7QUFBQSxJQUNuQixjQUFjO0FBQUEsTUFDWjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjLENBQUM7QUFBQSxFQUNqQjtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLGNBQWM7QUFBQSxJQUNkLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxJQUNaLGNBQWMsQ0FBQztBQUFBLEVBQ2pCO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsY0FBYztBQUFBLElBQ2QsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osY0FBYyxDQUFDO0FBQUEsRUFDakI7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxjQUFjO0FBQUEsSUFDZCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixjQUFjLENBQUM7QUFBQSxFQUNqQjtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLGNBQWM7QUFBQSxJQUNkLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxJQUNaLG1CQUFtQjtBQUFBLElBQ25CLGNBQWMsQ0FBQztBQUFBLEVBQ2pCO0FBQ0Y7QUFpQk8sSUFBTSxvQ0FBZ0U7QUFBQSxFQUUzRTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBRUE7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBRUE7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBRUE7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUVBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBO0FBQUEsSUFDRSxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0E7QUFBQSxJQUNFLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFFQTtBQUFBLElBQ0UsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLEVBQ2Q7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
