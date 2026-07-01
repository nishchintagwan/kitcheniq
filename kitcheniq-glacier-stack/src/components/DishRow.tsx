import { StatusPill, Progress } from './Core';
import type { Dish } from '../data/kitchenData';
const colors={healthy:'var(--green)',watch:'var(--amber)',critical:'var(--red)'};
export function DishRow({dish,compact=false}:{dish:Dish;compact?:boolean}){return <div className="card elevated" style={{padding:10,display:'grid',gap:8}}><div className="between"><div><b style={{fontSize:13}}>{dish.name}</b><div className="small">{dish.category} · ₹{dish.price}</div></div><StatusPill status={dish.status}/></div>{!compact&&<Progress value={dish.margin} color={colors[dish.status]}/>}<div className="between small"><span>Margin {dish.margin}%</span><span style={{color:dish.delta>0?'var(--green)':'var(--red)',fontWeight:800}}>{dish.delta>0?'+':''}{dish.delta}%</span></div></div>}
