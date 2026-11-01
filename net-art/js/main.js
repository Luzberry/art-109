        let password = "tutorial123";
        
        (function passcodeprotect() {
            let passcode = prompt("Enter Password to Access Protected Content:");
            
            while (passcode !== password) {
                if (passcode === null) {
                    // User clicked Cancel
                    alert("Access denied. Page will not load.");
                    return;
                }
                alert("Incorrect Password! Please try again.");
                passcode = prompt("Enter Password to Access Protected Content:");
            }
            
            alert("Access Granted! Welcome!");
            document.getElementById("container").style.display = "block";
        })();