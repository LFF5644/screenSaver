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
		size:2,
	}
});
fb.writeFrame();

const fn=kb=>{
	const key=kb.toString("utf-8");
	const progressbar=fb.getProgressbarEntry(pId);

	let percent=Number(key)*10;
	if(key==="f") percent=100;
	else if(key==="+") percent=progressbar.progress.value+1;
	else if(key==="-") percent=progressbar.progress.value-1;
	else if(isNaN(percent)){
		fb.removeProgressbar(pId);
		fb.writeFrame();
		return;
	}

	fb.changeProgress(pId,percent);
	fb.writeFrame();

	pause(fn);
};
pause(fn);

