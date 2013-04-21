$(document).ready(function() {
    
    //default to wasd keyboard commands
    var selectedInput = "keyboard";
  
    $("#keyboardBtn").click(function() {
        if(selectedInput != "keyboard")
        {
            $("#leapBtn").removeClass("selected");
            $("#mobileBtn").removeClass("selected");
            $("#keyboardBtn").addClass("selected");

            $(".mobile").hide();
            $(".leap").hide();

            $(".keyboard").fadeIn("slow", function(){
                $(this).fadeOut("slow", function(){});
            }); 

            selectedInput = "keyboard";
        }
    });
  
    $("#mobileBtn").click(function() {
        if(selectedInput != "mobile")
        {
            $("#keyboardBtn").removeClass("selected");
            $("#leapBtn").removeClass("selected");
            $("#mobileBtn").addClass("selected");
        
            $(".keyboard").hide();
            $(".leap").hide();
        
            $(".mobile").fadeIn("slow", function(){
                $(this).fadeOut("slow", function(){});
            }); 
        
            selectedInput = "mobile";
        }
    });
    
    $("#leapBtn").click(function() {
        if(selectedInput != "leap")
        {
            $("#keyboardBtn").removeClass("selected");
            $("#mobileBtn").removeClass("selected");
            $("#leapBtn").addClass("selected");
        
            $(".mobile").hide();
            $(".keyboard").hide();
        
            $(".leap").fadeIn("slow", function(){
                $(this).fadeOut("slow", function(){});
            }); 
        
            selectedInput = "leap";
        }
    });
    
    $("ul#controllers li img").mousedown(function(){
        return false;
    });
    
  
});