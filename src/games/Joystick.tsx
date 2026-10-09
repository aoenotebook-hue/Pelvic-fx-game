import {useEffect,useRef,useState} from "react";
export function joystickVector(x:number,y:number,radius:number){const distance=Math.hypot(x,y),strength=Math.min(1,Math.max(0,(distance/radius-.15)/.85));return distance?{x:x/distance*strength,y:y/distance*strength}:{x:0,y:0};}
export function Joystick({onMove,label}:{onMove(vector:{x:number;y:number}):void;label:string}){
 const [vector,setVector]=useState({x:0,y:0});const pointer=useRef<number|null>(null);const callback=useRef(onMove);callback.current=onMove;
 const stop=()=>{pointer.current=null;setVector({x:0,y:0});callback.current({x:0,y:0});};
 useEffect(()=>{const hidden=()=>{if(document.hidden)stop();};window.addEventListener("blur",stop);document.addEventListener("visibilitychange",hidden);return()=>{window.removeEventListener("blur",stop);document.removeEventListener("visibilitychange",hidden);callback.current({x:0,y:0});};},[]);
 const move=(event:React.PointerEvent<HTMLDivElement>)=>{const rect=event.currentTarget.getBoundingClientRect();const next=joystickVector(event.clientX-rect.left-rect.width/2,event.clientY-rect.top-rect.height/2,rect.width/2-18);setVector(next);callback.current(next);};
 return <div className="joystick" role="group" aria-label={label} onPointerDown={event=>{if(pointer.current!==null)return;event.preventDefault();pointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);move(event);}} onPointerMove={event=>{if(pointer.current===event.pointerId)move(event);}} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}><span className="joystick-cross" aria-hidden="true">＋</span><span className="joystick-knob" style={{transform:`translate(${vector.x*35}px,${vector.y*35}px)`}} aria-hidden="true"/></div>;
}
