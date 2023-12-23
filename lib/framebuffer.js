const buildCharacterMap=require("../lib/buildCharacterMap");
const fs=require("fs");

const letterSpacing=10;

let isInit=false;
let buffer=Buffer.alloc(0);
let displayedText=new Map();
let displayedProgressbar=new Map();
let chars={};

function getPseudocolor(b,g,r){
	// 24/32 bit colors https://www.rapidtables.com/web/color/RGB_Color.html
	// 8 bit colors     https://doc.ecoscentric.com/ref/framebuf-colour.html
	const PSEUDOCOLOR_BLACK=0x00;
	const PSEUDOCOLOR_BLUE=0x01;
	const PSEUDOCOLOR_GREEN=0x02;
	const PSEUDOCOLOR_CYAN=0x03;
	const PSEUDOCOLOR_RED=0x04;
	const PSEUDOCOLOR_MAGENTA=0x05;
	const PSEUDOCOLOR_BROWN=0x06;
	const PSEUDOCOLOR_LIGHTGREY=0x07;
	const PSEUDOCOLOR_LIGHTGRAY=0x07;
	const PSEUDOCOLOR_DARKGREY=0x08;
	const PSEUDOCOLOR_DARKGRAY=0x08;
	const PSEUDOCOLOR_LIGHTBLUE=0x09;
	const PSEUDOCOLOR_LIGHTGREEN=0x0A;
	const PSEUDOCOLOR_LIGHTCYAN=0x0B;
	const PSEUDOCOLOR_LIGHTRED=0x0C;
	const PSEUDOCOLOR_LIGHTMAGENTA=0x0D;
	const PSEUDOCOLOR_YELLOW=0x0E;
	const PSEUDOCOLOR_WHITE=0x0F;
	const rgb=`${r},${g},${b}`;
	let color=0x00;

	if(rgb==="255,0,0") color=PSEUDOCOLOR_LIGHTRED;
	else if(rgb==="128,0,0") color=PSEUDOCOLOR_RED;

	else if(rgb==="0,255,0") color=PSEUDOCOLOR_LIGHTGREEN;
	else if(rgb==="0,128,0") color=PSEUDOCOLOR_GREEN;

	else if(rgb==="0,0,255") color=PSEUDOCOLOR_BLUE;

	else if(rgb==="255,255,0") color=PSEUDOCOLOR_YELLOW;

	else if(rgb==="255,255,255") color=PSEUDOCOLOR_WHITE;

	else return ((r * 7 / 255) << 5) + ((g * 7 / 255) << 2) + (b * 3 / 255);
	return color;
}

function writeFrame(type="promise"){
	if(type==="promise"){
		return new Promise((resolve,reject)=>{
			fs.writeFile(fbPath,buffer,resolve);
		});
	}
	else{
		fs.writeFileSync(fbPath,buffer);
	}
}
function writePixel(x,y,...rgb){
	const offset=(y*screen_width+x)*bytesPerPixel;
	if(bytesPerPixel===1){
		const byte=getPseudocolor(...rgb);
		buffer.writeUInt8(byte,offset);
	}
	else if(bytesPerPixel===3||bytesPerPixel===4){
		buffer.writeUInt8(rgb[0],offset);
		buffer.writeUInt8(rgb[1],offset+1);
		buffer.writeUInt8(rgb[2],offset+2);
		if(bytesPerPixel===4) buffer.writeUInt8(255,offset+3);
	}
	else throw new Error(`${bytesPerPixel} bytes per pixel not supported!`);
}
function writeRectangle(startX,startY,width,height,...rgb){
	for(let y=startY; y<startY+height; y+=1){
		for(let x=startX; x<startX+width; x+=1){
			writePixel(x,y,...rgb);
		}
	}
}
function clearScreen(...rgb){
	if(rgb.length<3) rgb=bgColor;
	for(let i=0; i<frameBufferLength; i+=bytesPerPixel){
		if(bytesPerPixel===1){
			const byte=getPseudocolor(...rgb);
			buffer.writeUInt8(byte,i);
		}
		else if(bytesPerPixel>2){
			buffer.writeUInt8(rgb[0],i);
			buffer.writeUInt8(rgb[1],i+1);
			buffer.writeUInt8(rgb[2],i+2);
			if(bytesPerPixel===4) buffer.writeUInt8(255,i+3);
		}
		else throw new Error(`${bytesPerPixel} bytes per pixel not supported!`);
	}
}
function writeLine(startX,startY,length,mode,lineThickness,...rgb){
	if(mode===1||mode==="|"){
		for(let x=startX; x<startX+lineThickness; x+=1){
			for(let y=startY; y<startY+length; y+=1){
				writePixel(x,y,...rgb);
			}
		}
	}
	else if(mode===0||mode==="-"){
		for(let y=startY; y<startY+lineThickness; y+=1){
			for(let x=startX; x<startX+length; x+=1){
				writePixel(x,y,...rgb);
			}
		}
	}
	else throw new Error("mode is not allowed!");
}

// TEXT //
function getTextLength(size,content){
	let currentX=0;
	let currentY=0;
	for(let index=0; index<content.length; index+=1){
		const char=content[index];
		if(!chars[size]) throw new Error("SIZE "+size+" do not exist! please build this size first!");
		const charObject=chars[size][char];
		if(!charObject) throw new Error("char "+char+" do not exist! add to textures.json & build first!");
		const charMap=charObject.map;
		currentX+=charObject.width+letterSpacing+size*2;
		currentY=charObject.height;
	}
	currentX-=letterSpacing+size*2;
	return[currentX,currentY];
}
function getTextPos(startX,startY,size,content){
	let currentX=startX;
	let currentY=0;
	for(let index=0; index<content.length; index+=1){
		const char=content[index];
		if(!chars[size]) throw new Error("SIZE "+size+" do not exist! please build this size first!");
		const charObject=chars[size][char];
		if(!charObject) continue;
		const charMap=charObject.map;
		currentX+=charObject.width+letterSpacing;
		currentY=charObject.height;
	}
	currentX-=letterSpacing;
	return[currentX,currentY];
}
function writeText(startX,startY,size,content,...rgb){
	const id=`${Date.now()}${startX}${startY}${content}${rgb.join("")}`;
	let currentX=startX;
	let lengthY=0;
	for(let index=0; index<content.length; index+=1){
		const char=content[index];
		if(!chars[size]) throw new Error("SIZE "+size+" do not exist! please build this size first!");
		const charObject=chars[size][char];
		if(!charObject) throw new Error("char '"+char+"' do not exist");
		const charMap=charObject.map;

		if(charMap.includes(1)){
			for(let row=0; row<charObject.height; row+=1){
				for(let column=0; column<charObject.width; column+=1){
					const pixelIndex=(row*charObject.width)+column;
					const writePixelPos=charMap[pixelIndex];
					if(!writePixelPos) continue;
					const x=currentX+column;
					const y=startY+row;
					writePixel(x,y,...rgb);
				}
			}
		}
		currentX+=charObject.width+letterSpacing+size*2;
		lengthY=charObject.height;
	}
	currentX-=letterSpacing+size*2;
	const lengthX=currentX-startX;

	const textEntry={
		content,
		lengthX,
		lengthY,
		startX,
		startY,
		size,
		color: rgb,
	};
	displayedText.set(id,textEntry);

	return id;
}
function removeText(id,...rgb){
	const textEntry=displayedText.get(id);
	if(!textEntry) throw new Error("text id not exist");
	displayedText.delete(id);

	const {startX,startY,size,content}=textEntry;

	if(!rgb.length) rbg=bgColor;

	writeText(startX,startY,size,content,...rgb);
}
function getTextEntry(id){
	const textEntry=displayedText.get(id);
	if(!textEntry) throw new Error("text id not exist");
	return textEntry;
}

// Progressbar
function createProgressbar(
	startX,startY,width,height,{
		border={
			color: [0,255,0],
			size: 3,
		},
		progress={
			color: [0,0,255],
			value: 50,
		},
		text={
			color: [0,255,0],
			content: "%p%",
			size: 2,
		}
	}={},
){
	const id=`${Date.now()}${startX}${startY}${width}${height}`;

	writeLine(startX,startY,width,0,border.size,...border.color); // border top
	writeLine(startX,startY+height-border.size,width,0,border.size,...border.color); // border bottom
	
	writeLine(startX,startY,height,1,border.size,...border.color); // border left
	writeLine(startX+width-border.size,startY,height,1,border.size,...border.color); // border right

	// p = Progress (Progressbar Progress)
	const pStartX=startX+border.size;
	const pStartY=startY+border.size;
	const pWidth=width-border.size*2;
	const pHeight=height-border.size*2;

	const getValueFromPercent=(ground,percent)=>Math.round(ground/100*percent);

	writeRectangle(pStartX,pStartY,getValueFromPercent(pWidth,progress.value),pHeight,...progress.color);

	text.currentContent=text.content.split("%p").join(String(progress.value)); // "Update %p% Abgeschlossen" => "Update 95% Abgeschlossen"

	const [lengthX,lengthY]=getTextLength(text.size,text.currentContent);

	text.id=writeText(pStartX+(pWidth-lengthX)/2,pStartY+(pHeight-lengthY)/2,text.size,text.currentContent,...text.color);

	delete text.currentContent;
	displayedProgressbar.set(id,{
		startX, startY, width, height,
		pStartX, pStartY, pWidth, pHeight,
		border, progress, text,
	});
	return id;
}
function changeProgress(id,percent){
	const progressbar=displayedProgressbar.get(id);
	if(!progressbar) throw new Error("progressbar id "+id+" not exist");

	const {pStartX,pStartY,pWidth,pHeight,progress,text}=progressbar;
	const getValueFromPercent=(ground,percent)=>Math.round(ground/100*percent);

	if(percent>100) percent=100;
	else if(percent<0) percent=0;

	removeText(text.id);
	if(progress.value>percent){
		writeRectangle(pStartX,pStartY,pWidth,pHeight,...bgColor);
	}
	progress.value=percent;
	writeRectangle(pStartX,pStartY,getValueFromPercent(pWidth,percent),pHeight,...progress.color);

	text.currentContent=text.content.split("%p").join(String(percent)); // "Update %p% Abgeschlossen" => "Update 95% Abgeschlossen"
	const [lengthX,lengthY]=getTextLength(text.size,text.currentContent);
	text.id=writeText(pStartX+(pWidth-lengthX)/2,pStartY+(pHeight-lengthY)/2,text.size,text.currentContent,...text.color);

	delete text.currentContent;
	displayedProgressbar.set(id,{
		...progressbar,
		pStartX, pStartY,
		pWidth, pHeight,
		progress, text,
	});
}
function getProgressbarEntry(id){
	const progressbar=displayedProgressbar.get(id);
	if(!progressbar) throw new Error("progressbar id "+id+" not exist");
	return progressbar;
}

module.exports=options=>{
	if(isInit) throw new Error("framebuffer is already init!");
	isInit=true;

	options={
		fbPath: "/dev/fb0",
		charactersBinLocation: "build/characters.bin",
		bytesPerPixel: 4,
		bgColor: [0,0,0],
		frameBufferLength: options.frameBufferLength?options.frameBufferLength:options.screen_width*options.screen_height*options.bytesPerPixel,
		...options,
	};

	for(let optionKey of Object.keys(options)){
		const option=options[optionKey];
		if(global[optionKey]!==undefined) throw new Error("option "+optionKey+" overwrite is not allowed!");
		global[optionKey]=option;
	}
	chars=buildCharacterMap.getCompressedCharacters(charactersBinLocation);

	buffer=Buffer.alloc(screen_width*screen_height*bytesPerPixel);
	const functions={
		changeProgress,
		clearScreen,
		createProgressbar,
		fbGet:()=>buffer.slice(0,buffer.length),
		getProgressbarEntry,
		getTextEntry,
		getTextLength,
		getTextPos,
		removeText,
		writeFrame,
		writeLine,
		writePixel,
		writeRectangle,
		writeText,
	};
	return functions;
};
