// base-v2.jpg 原圖 1280×720；以下百分比依六間房間可見地板量測。
export const imageSize={width:1280,height:720};
// 顯示時裁掉底圖四周空白（百分比，原圖內容邊界約 12.4–88.0% × 5.4–96.0%；左右各再裁進約 1.1%（只切到 K100／K300 外牆邊緣，不影響房名與小人））。房名與小人仍用原圖百分比座標，由 .ko-canvas 一起放大。
export const crop={x:13.5,y:4,w:73,h:92};
export const rooms=[
 {key:'k000',label:'K000 組長室',labelX:45,labelY:13,polygon:[[36,8],[48,4],[55,12],[55,29],[44,37],[35,25]]},
 {key:'k100',label:'K100 系統',labelX:27,labelY:28,polygon:[[13,29],[33,19],[45,34],[45,62],[33,79],[13,57]]},
 {key:'k200',label:'K200 AI',labelX:47,labelY:49,polygon:[[36,49],[49,38],[60,50],[60,68],[48,79],[35,65]]},
 {key:'k300',label:'K300 製程',labelX:76,labelY:39,polygon:[[66,39],[77,29],[87,39],[87,62],[76,71],[65,58]]},
 {key:'meeting',label:'會議室',labelX:64,labelY:18,polygon:[[55,18],[62,11],[73,20],[73,39],[64,47],[54,35]]},
 {key:'lounge',label:'娛樂室',labelX:56,labelY:69,polygon:[[46,67],[60,55],[72,71],[72,87],[54,96],[44,81]]}
];
// 小人不加名牌；座標落在相應房間地板區。身體色屬 SVG 插畫。
export const people=[
 {key:'950157',name:'950157',room:'k000',x:46,y:23,body:'#ff8f7a',status:'wait'},
 {key:'tiffany',name:'Tiffany',room:'lounge',x:50,y:80,body:'#e0a1c7',status:'wait'},
 {key:'cw',name:'CW',room:'lounge',x:55,y:74,body:'#91b6df',status:'wait'},
 {key:'frank',name:'Frank',room:'lounge',x:58,y:84,body:'#a4c4a5',status:'wait'},
 {key:'terry',name:'Terry',room:'lounge',x:64,y:81,body:'#c3a5e0',status:'wait'}
];
export function pointInPolygon(x,y,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
