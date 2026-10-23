import {Inflate} from './vendor/pako-inflate.js';

// Raw deflate lets us locate the end before the legacy CBC padding. Validate
// the zlib header and Adler-32 ourselves; never accept a partially decoded file.
export function inflateLegacy(data,limit){
 if(data.length<6||(data[0]&15)!==8||(data[0]>>4)>7||((data[0]<<8)+data[1])%31||(data[1]&32))throw Error('Invalid zlib header');
 const stream=new Inflate({raw:true,chunkSize:16384}),chunks=[];
 let total=0,a=1,b=0;
 stream.onData=chunk=>{
  total+=chunk.length;if(total>limit)throw Error('Dữ liệu giải nén vượt quá 20 MB.');
  for(const n of chunk){a=(a+n)%65521;b=(b+a)%65521;}chunks.push(chunk);
 };
 try{
 stream.push(data.subarray(2),true);
 const end=2+stream.strm.next_in;
 if(stream.err||!stream.ended||end+4>data.length)throw Error('Incomplete zlib stream');
 const checksum=new DataView(data.buffer,data.byteOffset+end,4).getUint32(0);
 if(checksum!==((b<<16)|a)>>>0)throw Error('Invalid zlib checksum');
 const out=new Uint8Array(total);let offset=0;
 for(const c of chunks){out.set(c,offset);offset+=c.length;}
 return out;
 }finally{for(const c of chunks)c.fill(0);stream.strm.output?.fill(0);}
}
