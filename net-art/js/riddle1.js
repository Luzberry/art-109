        let password = "cat";
        
        (function passcodeprotect() {
            let passcode = prompt("my eyes glow bright when the room turns dark. what am I?");
            
            while (passcode !== password) {
                if (passcode === null) {
                    // User clicked Cancel
                    alert("...");
                    return;
                }
                alert("incorrect. (there are no caps)");
                passcode = prompt("my eyes glow bright when the room turns dark. what am I? hint: 𑄝੭");
            }
            
            alert("your first code number is: 2");
            document.getElementById("container").style.display = "block";
        })();