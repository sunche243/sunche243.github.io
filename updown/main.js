var attempt = 1;
var min = 0;
var max = 50;
var guess = Math.floor(Math.random() * (max - min + 1)) + min;
var input = null;

console.log(guess);

document.getElementById('minn').innerHTML = min;
document.getElementById('maxn').innerHTML = max;
document.getElementById('attemptn').innerHTML = attempt;

function bring(){
    if(attempt < 4){

        var input = document.getElementById('ans').value;
        console.log(input)

        if(min < input && input < max)
        {
            if(input > guess)
            {
                document.getElementById('maxn').innerHTML = input;
                max = input;
            }
            else if(input < guess)
            {
                document.getElementById('minn').innerHTML = input;
                min = input;
            }
            else
            {
                alert('정답');
                location.reload();
            };

            document.getElementById('ans').value = null;
            attempt++;
            document.getElementById('attemptn').innerHTML = attempt;

        }
        else
        {
            if(input == 'undefined')
            {
                alert('값을 입력하세요');
            }
            else if(input >= max)
            {
                alert('max보다 작은 값을 입력하세요');
            }
            else if(input <= min)
            {
                alert('min보다 큰 값을 입력하세요');
            };
        };

    }
    else
    {
        alert('실패!');
        location.reload();
    };
};