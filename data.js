const MENU = [['solo',80,906],['multi',81,910],['controls',83,920],['options',84,921],['saves',85,923],['help',87,20],['quit',88,931]].map(([id,label,hint])=>[id,GAME_TEXT[label],GAME_TEXT[hint]]);
const LEVEL_IDS = [1,2,3,4,5,10,11,12,15,20,21,22,23,25,26,30,31,32,33,34,40,41,42,43,44,50,51,52,53,54,60,61,62,63,64,66,70,71,72,73,74,75];
const DEFAULT_SETTINGS = {effects:100,music:40,explosions:16,horizon:true,sky:true,cursor:true,windowed:true,textures:true,musicOn:true,markers:true,stereo:false,resolution:'1920 × 1080',joystick:true,alternate:true,force:true};
const DEFAULT_BINDINGS = Object.fromEntries([[544,'P'],[536,'Escape'],[500,'A / D'],[501,'S / W'],[511,'Z / Q'],[502,'W / S'],[503,'Z / Q'],[504,'A / D'],[506,'Space'],[508,'Enter'],[505,'Numpad 0'],[521,'M'],[522,'F'],[515,'N'],[516,'A'],[517,'C'],[806,'B'],[533,'F2'],[534,'F3'],[811,'E']].map(([id,key])=>[GAME_TEXT[id],key]));
const THEME = {'--accent':'#66aeb1','--button-color':'#526e79','--button-width':'640px','--button-height':'44px','--font-size':'18px','--brightness':'.82','--panel-opacity':'.94'};
const HELP = GAME_HELP;
