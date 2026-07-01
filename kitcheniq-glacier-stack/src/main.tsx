import React from 'react';import{createRoot}from'react-dom/client';import'./styles/tokens.css';import{allScreens}from'./screens/Screens';
function App(){return <div className="app-shell">{allScreens.map((S,i)=><div><S/><div style={{textAlign:'center',marginTop:8,color:'#9AA4B8'}}>{i+1}. {['Login','Dashboard','Recipe Detail','Add Recipe','Ingredients','Nutrition','Menu Optimizer','Operations Autopilot','Intelligence Hub'][i]}</div></div>)}</div>}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
