
var count = 0;

document.getElementById('number').innerHTML = count;


// document.getElementById('plus').addEventListener('click', function(){

//     count++;
//     document.getElementById('number').innerHTML = count;

// });

function Add(a){

    if(a == 'plus'){
        count++;
    }else{
        count--;
    };

    if(count < 0){
        count++
        alert('0 미만 되겠냐 ㅋ')
    }else{

    }

    document.getElementById('number').innerHTML = count;
};