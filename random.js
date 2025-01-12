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

const circles=[];

function createStar(){
	const starColor=[255,255,255];
	const [x,y]=randomCords(50);

	const radius=randomNumber(50,0);

	if(checkCirclesTouchCircle(x,y,radius)) return;
	drawCircle(x,y,radius,255,255,255);
	circles.push([x,y,radius]);


	//fb.writePixel(startX,startY,255,255,255);
}

function checkCirclesTouchCircle(centerX,centerY,radius){
	for(const circle of circles){
		const [circleX,circleY,circleRadius]=circle;
		for(let y=circleY-circleRadius; y<=circleY+circleRadius; y+=1){
			for(let x=circleX-circleRadius; x<=circleX+circleRadius; x+=1){
				
				for(let newY=centerY-radius; newY<=centerY+radius; newY+=1){
					for(let newX=centerX-radius; newX<=centerX+radius; newX+=1){
						
						const dx=x-centerX;
						const dy=y-centerY;
						const circle_dx=newX-circleX;
						const circle_dy=newY-circleY;

						if(Math.sqrt(dx*dx+dy*dy)<=radius){
							return true;
						}
					}
				}
			}
		}
	}
	return false;
}
function drawCircle(centerX,centerY,radius,...color) {
	for(let y=centerY-radius; y<=centerY+radius; y+=1) {
		for(let x=centerX-radius; x<=centerX+radius; x+=1) {
			// Berechne den Abstand des Pixels vom Kreismittelpunkt
			const dx=x-centerX;
			const dy=y-centerY;

			// Überprüfe, ob der Punkt innerhalb des Kreises liegt
			if(Math.sqrt(dx*dx+dy*dy)<(Math.round(radius/1.5))){
				fb.writePixel(x,y,...color); // Pixel setzen
			}
			else if(Math.sqrt(dx*dx+dy*dy)<=radius){
				fb.writePixel(x,y,255,0,0);
			}
		}
	}
}

fb.writeFrame();

fb.clearScreen(...bgColor);
console.log("writing stars...");
(async ()=>{
	for(let i=0; i<50; i+=1){
		createStar();
		await fb.writeFrame();
		fb.writeFrame();
	}
})();

