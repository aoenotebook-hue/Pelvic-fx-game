import {useEffect,useRef} from "react";
export function PracticeReset({thai,onCancel,onConfirm}:{thai:boolean;onCancel():void;onConfirm():void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal?.();return()=>dialog.current?.close?.();},[]);
 return <dialog ref={dialog} className="reset-dialog" aria-labelledby="reset-title" onCancel={event=>{event.preventDefault();onCancel();}}><h2 id="reset-title">{thai?"เริ่มฝึกใหม่?":"Start a new practice attempt?"}</h2><p>{thai?"รางวัลจะเริ่มที่ 0 ผลการประเมินเดิมและงานที่รอส่งจะยังถูกเก็บไว้":"Rewards start at zero. Your assessed result and pending records stay saved."}</p><button autoFocus className="secondary" onClick={onCancel}>{thai?"ยกเลิก":"Cancel"}</button><button className="primary" onClick={onConfirm}>{thai?"เริ่มฝึกใหม่":"Start practice"}</button></dialog>;
}
