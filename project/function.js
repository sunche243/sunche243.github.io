    /* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
function myFunction() {
    document.getElementById("myDropdown").classList.toggle("show");
  }
  var a;
      var a=a+1
  // Close the dropdown menu if the user clicks outside of it
  window.onclick = function(event) {
      console.log(a)
    if (!event.target.matches('.title')) {
      var dropdowns = document.getElementsByClassName("iframe");
      var i;
      for (i = 0; i < dropdowns.length; i++) {
        var openDropdown = dropdowns[i];
        if (openDropdown.classList.contains('show')) {
          openDropdown.classList.remove('show');
        }
      }
    }
  }