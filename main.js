var attempt = 1;
var min = 0;
var max = 50;
var guess = Math.floor(Math.random() * (max - min + 1)) + min;

if(guess == 50 || guess == 0){
    var guess = Math.floor(Math.random() * (max - min + 1)) + min;
};

document.addEventListener("keyup", function(event) {
    if(event.code === 'Enter') {
        bring();
    };
});

function add_attempt(){
    
    attempt++; 
    if(attempt == 3){
        document.getElementById('attem').innerHTML = '마지막 시도';
    }else if(attempt == 4){
        alert('실패') ;
        location.reload();
        
    }else{
        document.getElementById('attemptn').innerHTML = attempt;
    };

};

function bring(){

    var input = document.getElementById('ans').value;
    input = parseInt(input)

    if(min < input && input < max)
    {
        if(input > guess)
        {
            document.getElementById('maxn').innerHTML = input;
            add_attempt();
            max = input;
        }
        else if(input < guess)
        {
            document.getElementById('minn').innerHTML = input;
            add_attempt();
            min = input;
        }
        else
        {
            alert('정답');
            location.reload();
        };
    }
    else
    {
        if(!input)
        {
            alert('값을 입력하세요');
        }
        else if(input >= max)
        {
            alert(max + "보다 작은 값을 입력하세요");
        }
        else if(input <= min)
        {
            alert(min + "보다 큰 값을 입력하세요");
        };
    };

    document.getElementById('ans').value = null;

};
