const fb=require("./lib/framebuffer")({
	bgColor: [0,0,0],
	fbPath: "/dev/fb0",
	fontSize: 3,
	newlineOffset: 50,
	...require("./config.json"),
});

function pause(fn){
	process.openStdin();
	const raw=process.stdin.isRaw;
	process.stdin.setRawMode(true);
	process.stdin.once("data",key=>{
		process.stdin.setRawMode(raw);
		process.stdin.pause();
		fn(key);
	});
}

fb.clearScreen(...bgColor);
const pId=fb.createProgressbar(100,100,500,100,{
	text:{
		color: [255,255,255],
		content: "Progress: %p%",
		size: 2,
		onUpdate: progress=>"Progress "+progress+"%",
	},
});
fb.writeFrame();

const fn=async kb=>{
	const key=kb.toString("utf-8");
	const progressbar=fb.getProgressbarEntry(pId);

	let percent=Number(key)*10;
	if(isNaN(percent)) percent=progressbar.progress.value;
	if(key==="f"){
		percent=100;
	}
	else if(key==="+"){
		percent=progressbar.progress.value+1;
	}
	else if(key==="-"){
		percent=progressbar.progress.value-1;
	}
	else if(key==="a"){
		for(let counter=0; counter<100; counter++){
			fb.changeProgress(pId,counter);
			await fb.writeFrame();
		}
		percent=100;
	}
	else if(key==="q"){
		fb.removeProgressbar(pId);
		fb.writeFrame();
		return;
	}
	
	fb.changeProgress(pId,percent);
	await fb.writeFrame();
	//console.log("percent:",percent)
	pause(fn);
};
pause(fn);

