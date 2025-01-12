// LIBRARY BY LF5644
const charactersJSON=require("../characters.json");
const fs=require("fs");

let allowLogging=true;

function byteToBits(byte){ // help by chatGPT
	let bits=[];
	for(let i=7; i>=0; i-=1){
		bits.push((byte>>i)&1);
	}
	return bits;
}
function bitsToByte(bits){ // help by chatGPT
	let byte=0;
	for(i=0; i<8; i+=1){
		byte=(byte<<1)|bits[i];
	}
	return byte;
}

function compressCharacters(characters=charactersJSON,sizes=[1]){
	if(!characters) characters=charactersJSON;
	const chars=Object.keys(characters);
	let contentTable=[];		// address of characters
	let encodeCharacters=[];	// charMap+charMap+charMap ...

	for(let sizeIndex=0; sizeIndex<sizes.length; sizeIndex+=1){
		const size=sizes[sizeIndex];
		for(let charIndex=0; charIndex<chars.length; charIndex+=1){
			const char=chars[charIndex];
			let charMap=characters[char];
			if(allowLogging) process.stdout.write(`\rsize: ${size}, char: ${char}, ${charIndex+1}/${chars.length}    `);
			if(size>1){
				let newCharMap=[];

				for(let counterRow=0; counterRow<8; counterRow+=1){
					const row=[];
					for(let counterColumn=0; counterColumn<8; counterColumn+=1){
						const pixelIndex=counterRow*8+counterColumn;
						const byte=charMap[pixelIndex];

						for(let i=0; i<size; i+=1){
							row.push(byte);
						}
					}
					for(let i=0; i<size; i+=1){
						newCharMap=[
							...newCharMap,
							...row,
						];
					}
				}

				charMap=newCharMap;
			}

			let emptyRowsAtStart=0;
			let emptyRowsAtEnd=0;
			if(charMap.includes(1)){
				for(let column=0; column<8*size; column+=1){
					let rowEmpty=true;
					for(let row=0; row<8*size; row+=1){
						const pixelIndex=(row*8*size)+column;
						const writePixel=charMap[pixelIndex];
						if(writePixel){
							rowEmpty=false;
							break;
						}
					}
					if(rowEmpty) emptyRowsAtStart+=1;
					else break;
				}

				for(let column=(8*size)-1; column>0; column-=1){
					let rowEmpty=true;
					for(let row=0; row<8*size; row+=1){
						const pixelIndex=(row*8*size)+column;
						const writePixel=charMap[pixelIndex];
						if(writePixel){
							rowEmpty=false;
							break;
						}
					}
					if(rowEmpty) emptyRowsAtEnd+=1;
					else break;
				}
			}
			const compressedCharMap=[/*0,1,0,0,0,1,0,1,0,0, ..*/];
			for(let row=0; row<8*size; row+=1){
				for(let column=emptyRowsAtStart; column<8*size-emptyRowsAtEnd; column+=1){
					const pixelIndex=(row*8*size)+column;
					const bit=charMap[pixelIndex];
					compressedCharMap.push(bit);
					//process.stdout.write(bit?"#":".");
				}
				//process.charContentTablestdout.write("\n");
			}
			//process.stdout.write("\n");
			const charContentTable=[
				// Buffer.from("A"), 8, 8, 1,
				// "char", width, height, size,
				Buffer.from(char)[0],
				(8*size)-emptyRowsAtStart-emptyRowsAtEnd, 8*size, size,
			];

			// append to main list
			contentTable=[
				...contentTable,
				...charContentTable,
			];
			encodeCharacters=[
				...encodeCharacters,
				...compressedCharMap,
			];
		}
		if(allowLogging) process.stdout.write("\n");
	}
	if(allowLogging) process.stdout.write("\n");
	/*for(let i=0; i<contentTable.length; i+=4){
		const charContentTable=[];
		for(let index=i; index<i+5; index+=1){
			const byte=contentTable[index];
			charContentTable.push(byte);
		}

		const [charByte,width,height,size]=charContentTable;

		const char=Buffer.from([charByte]).toString("utf-8");
		console.log(char,width,height,size);

	}*/
	const bytes=[];
	for(let offset=0; offset<encodeCharacters.length; offset+=8){
		const bits=[
			encodeCharacters[offset],
			encodeCharacters[offset+1],
			encodeCharacters[offset+2],
			encodeCharacters[offset+3],
			encodeCharacters[offset+4],
			encodeCharacters[offset+5],
			encodeCharacters[offset+6],
			encodeCharacters[offset+7],
		];
		const byte=bitsToByte(bits);
		bytes.push(byte);
	}

	const buffer=Buffer.from([
		...contentTable,
		0,0,0,0, // say decoder: now characters
		...bytes,
	]);
	return buffer;
	//fs.writeFileSync("./compressedCharacterMap.bin",buffer);
}
function getCompressedCharacters(buffer){
	buffer=typeof(buffer)!=="string"?buffer:fs.readFileSync(buffer);
	const characters={};
	const contentTable=[];
	let offset=0;

	for(let index=0; index<buffer.length; index+=4){
		const charContentTable=[
			buffer[index],
			buffer[index+1],
			buffer[index+2],
			buffer[index+3],
		];

		if(!charContentTable[0]){
			offset=index+4;
			break;
		}
		const [charByte,width,height,size]=charContentTable;
		contentTable.push(charByte,width,height,size);
	}
	const charMaps=[];
	for(let index=offset; index<buffer.length; index+=1){
		const byte=buffer[index];
		const bits=byteToBits(byte);
		charMaps.push(...bits);
	}
	offset=0;
	for(let index=0; index<buffer.length; index+=4){
		const charContentTable=[
			buffer[index],
			buffer[index+1],
			buffer[index+2],
			buffer[index+3],
		];
		if(!charContentTable[0]) break;
		
		const [charByte,width,height,size]=charContentTable;
		const char=Buffer.from([charByte]).toString("utf-8");
		const charMap=charMaps.slice(offset,width*height+offset);

		if(!characters[size]) characters[size]={};

		characters[size][char]={
			width,
			height,
			map: charMap,
		};
		offset+=width*height;
	}
	return characters;
}

module.exports={
	compressCharacters,
	getCompressedCharacters,
	setLogging: (logging)=> allowLogging=Boolean(logging),
}