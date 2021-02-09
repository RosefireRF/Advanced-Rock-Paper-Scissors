opcije = ['scissors', 'paper', 'rock']
class Fighter {
    constructor(type, user) {
        this.hp = 100;
        this.type = type;
        if (type === 0){
            this.scissordamage = 20;
            this.paperdamage = 10;
            this.rockdamage = 10;
            this.color = 'red';
        }
        if (type === 2){
            this.scissordamage = 10;
            this.paperdamage = 10;
            this.rockdamage = 20;
            this.color = 'blue';
        }
        if (type === 1){
            this.scissordamage = 10;
            this.paperdamage = 20;
            this.rockdamage = 10;
            this.color = 'green';
        }
    }
}
function update(){
    topLeft = document.getElementById('leftTop');
    topRight = document.getElementById('rightTop');
    topLeft.innerHTML = "<h1>" + player.hp + "</h1>";
    topRight.innerHTML = "<h1>" + computer.hp + "</h1>";
}
function buttons(){
    leftSelect = document.getElementById('leftSelect');
    leftSelect.innerHTML = "<img class='option' id='sword' onclick=fight('0') src='images/sword.png' alt=''><img class='option' id='bow' onclick=fight('1') src='images/bow.png' alt=''><img class='option' id='shield' onclick=fight('2') src='images/shield.png' alt=''>";
    rightSelect = document.getElementById('rightSelect');
    rightSelect.innerHTML = "<img class='option' id='sword'  src='images/sword.png' alt=''><img class='option' id='bow' src='images/bow.png' alt=''><img class='option' id='shield' ' src='images/shield.png' alt=''>";
    next = document.getElementById('next');
    next.remove();
}
function playOut(){
    update();
    buttons();
}
classes = ['showSword','showBow','showShield']
images = ['sword.png', 'bow.png', 'shield.png']
function fight(input){
    leftSelect = document.getElementById('leftSelect');
    rightSelect = document.getElementById('rightSelect');
    selekt = document.getElementById('middle');
    input = parseInt(input);
    computerChoice = Math.floor(Math.random() * 3);
    leftSelect.innerHTML = "<img class='" + classes[input] +"'src='images/" + images[input] +  "'>";
    rightSelect.innerHTML = "<img class='" + classes[computerChoice] + "'src='images/" + images[computerChoice] +  "'>";
    selekt.innerHTML += "<div id='next' onclick='playOut()'>Play out</div>";
    if(input === computerChoice){
        console.log("same");
    }
    //If input is scissors
    else if(input == 0){
        //If computer picked rock
        if(computerChoice === 2){
            player.hp -= computer.rockdamage;
        }
        //If computer picked paper
        if(computerChoice === 1){
            computer.hp -= player.scissordamage;
        }
    }
    //If input is paper
    else if(input == 1){
        //If computer picked rock
        if(computerChoice === 2){
            computer.hp -= player.paperdamage;
        }
        //If computer picked scissors
        if(computerChoice === 0){
            player.hp -= computer.scissordamage;
        }
    }
    //If input is rock
    else if(input == 2){
        //If computer picked paper
        if(computerChoice === 1){
            player.hp -= computer.paperdamage;
        }
        //If computer picked scissors
        if(computerChoice === 0){
            computer.hp -= player.rockdamage;
        }
    }
}
function createButtons(){
    //Player select
    leftSelect = document.getElementById('leftSelect');
    leftSelect.innerHTML = "<img class='option' id='sword' onclick=fight('0') src='images/sword.png' alt=''><img class='option' id='bow' onclick=fight('1') src='images/bow.png' alt=''><img class='option' id='shield' onclick=fight('2') src='images/shield.png' alt=''>";
    rightSelect = document.getElementById('rightSelect');
    rightSelect.innerHTML = "<img class='option' id='sword'  src='images/sword.png' alt=''><img class='option' id='bow' src='images/bow.png' alt=''><img class='option' id='shield' ' src='images/shield.png' alt=''>";
    topLeft = document.getElementById('leftTop');
    topRight = document.getElementById('rightTop');
    topLeft.innerHTML += "<h1>" + player.hp + "</h1>";
    topRight.innerHTML += "<h1>" + computer.hp + "</h1>";
}
function myFunction(choice){
    computerChoice = Math.floor(Math.random() * 3);
    player = new Fighter(parseInt(choice), 'left');
    computer = new Fighter (computerChoice, 'right');
    //Scene construction
    canvas = document.getElementById('myCanvas');
    canvas.innerHTML = "<div id='mainScene'></div>";
    mainScene = document.getElementById('mainScene');
    //Declaring up, down, bottom divs
    mainScene.innerHTML += "<div id='hud'></div>";
    mainScene.innerHTML += "<div id='middle'></div>";
    mainScene.innerHTML += "<div id='bottom'></div>";
    //Dividing the top div
    topMenu = document.getElementById('hud');
    topMenu.innerHTML += "<div id='leftTop'></div>";
    topMenu.innerHTML += "<div id='rightTop'></div>";
    //Selection holders
    selekt = document.getElementById('middle');
    selekt.innerHTML += "<div id='leftSelect'>select</div>";
    selekt.innerHTML += "<div id='rightSelect'>select</div>";
    //Player select
    createButtons();
    //Add player character
    playField = document.getElementById('bottom');
    playField.innerHTML += "<div id='player' style='background-color:" + player.color + ";'>player</div>";
    //Add computer character
    playField.innerHTML += "<div id='computer'style='background-color:" + computer.color + ";'>computer</div>";
    console.log(player);
    console.log(computerChoice);
}
