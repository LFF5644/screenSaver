console.log("load...")
const fb=require("./lib/framebuffer")({
	bgColor: [0,0,0],
	fbPath: "/dev/fb0",
	fontSize: 3,
	newlineOffset: 50,
	...require("./config.json"),
});


function randomNumber(max=100,min=0){
	return Math.round(Math.max(Math.min(Math.random()*max,max),min));
}

function randomCords(offset=0){
	const x=randomNumber(screen_width-offset,offset);
	const y=randomNumber(screen_height-offset,offset);
	return [x,y];
}

function createStar(){
	const starColor=[255,255,255];
	const [startX,startY]=randomCords(offset=50);

	const rectangleWidth2=randomNumber(10,5);
	const rectangleWidth=rectangleWidth2*2;

	{ //main
		const x=startX-rectangleWidth2
		const y=startY-rectangleWidth2
		fb.writeRectangle(x,y,rectangleWidth,rectangleWidth,...starColor);
	}

	{ //bottom
		const x=startX-Math.round(rectangleWidth2/2);
		const y=startY+rectangleWidth2
		fb.writeRectangle(x,y,rectangleWidth2,rectangleWidth2,...starColor);
	}
	{ //top
		const x=startX-Math.floor(rectangleWidth2/2);
		const y=startY-rectangleWidth;
		fb.writeRectangle(x,y,rectangleWidth2,rectangleWidth2,...starColor);
	}
	{ //left
		const x=startX-rectangleWidth+1;
		const y=startY-Math.round(rectangleWidth2/2);
		fb.writeRectangle(x,y,rectangleWidth2,rectangleWidth2,...starColor);
	}
	{ //right
		const x=startX+rectangleWidth2;
		const y=startY-Math.round(rectangleWidth2/2);
		fb.writeRectangle(x,y,rectangleWidth2,rectangleWidth2,...starColor);
	}


	//fb.writePixel(startX,startY,255,255,255);
}

fb.clearScreen(...bgColor);
console.log("writing stars...");
for(let i=0; i<1e2; i+=1){
	createStar();
}
fb.writeFrame();
