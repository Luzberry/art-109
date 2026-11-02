        let password = "286";
        
        (function passcodeprotect() {
            let passcode = prompt("enter password to access protected content:");
            
            while (passcode !== password) {
                if (passcode === null) {
                    // User clicked Cancel
                    alert("Access Denied.");
                    return;
                }
                alert("find the code");
                passcode = prompt("enter password:");
            }
            
            alert("Access Granted");
            document.getElementById("container").style.display = "block";
        })();

