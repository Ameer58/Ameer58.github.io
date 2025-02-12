const presaleContractAddress = "TNhHZKdahzxgUSMkkJFQfJgFrcsvfnHPFU"; // Replace with actual address
const usdtContractAddress = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"; // Replace with actual address
const oracleContractAddress = "TGkLqNT25t6hiu3H4vdmLA3yqkJvZ8QQHT"; // Replace with actual oracle address

let tronWeb;
let trxToUsd = 0; // TRX to USD rate from oracle
let inrToUsd = 0; // INR to USD rate from oracle

// Fetch rates from the on-chain oracle
async function fetchRates() {
    try {
        if (!tronWeb) throw new Error("TronWeb not initialized.");

        const oracleContract = await tronWeb.contract().at(oracleContractAddress);
        const rates = await oracleContract.getRates().call();

        trxToUsd = rates[0] / 1e6; // TRX/USD rate (scaled by 1e6)
        inrToUsd = rates[1] / 1e6; // INR/USD rate (scaled by 1e6)

        // Update UI with rates
        const usdtToIrtElement = document.getElementById("usdtToIrtRate");
        if (usdtToIrtElement) {
            usdtToIrtElement.innerText = (1 / inrToUsd).toFixed(2) + " IRT";
        }

        const usdtToTrxElement = document.getElementById("usdtToTrxRate");
        if (usdtToTrxElement) {
            usdtToTrxElement.innerText = (1 / trxToUsd).toFixed(2) + " TRX";
        }
    } catch (error) {
        console.error("Error fetching rates from oracle: ", error);
        // Fallback values
        trxToUsd = 0.08; // Default TRX/USD rate
        inrToUsd = 0.012; // Default INR/USD rate
    }
}

// Show processing message
function showProcessingMessage() {
    const loadingElement = document.getElementById("loading");
    if (loadingElement) {
        loadingElement.style.display = "block";
    }
}

// Hide processing message
function hideProcessingMessage() {
    const loadingElement = document.getElementById("loading");
    if (loadingElement) {
        loadingElement.style.display = "none";
    }
}

// Connect TronLink
async function detectWallet() {
    if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
        connectTronLink();
    } else if (typeof window.tronLink !== "undefined") {
        // Wait for TronLink to initialize
        await waitForTronLink();
    } else {
        alert("Please install TronLink to proceed.");
    }
}

// Wait for TronLink to initialize
async function waitForTronLink() {
    return new Promise((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
            if (window.tronWeb && window.tronWeb.ready && window.tronWeb.defaultAddress.base58) {
                clearInterval(interval);
                connectTronLink();
                resolve();
            }
            attempts++;
            if (attempts > 10) {  // Stop after 10 tries (5 seconds)
                clearInterval(interval);
                alert("TronLink not detected. Please ensure it's installed and unlocked.");
            }
        }, 500); // Check every 500ms
    });
}

// Connect TronLink
async function connectTronLink() {
    try {
        if (!window.tronWeb || !window.tronWeb.ready) {
            throw new Error("TronLink is not detected. Please install TronLink and refresh the page.");
        }

        // Request permission to access accounts (needed for some TronLink versions)
        if (window.tronLink && window.tronLink.request) {
            await window.tronLink.request({ method: "tron_requestAccounts" });
        }

        tronWeb = window.tronWeb;

        // Ensure the wallet is unlocked
        if (!tronWeb.defaultAddress.base58) {
            throw new Error("Please unlock your TronLink wallet and try again.");
        }

        alert("Connected: " + tronWeb.defaultAddress.base58);
    } catch (error) {
        alert("Error connecting TronLink: " + error.message);
    }
}

// Validate contribution amount (in USDT)
function validateContribution(usdtAmount) {
    const minContribution = 10; // Minimum contribution in USDT
    const maxContribution = 1000; // Maximum contribution in USDT
    if (usdtAmount < minContribution || usdtAmount > maxContribution) {
        throw new Error(`Contribution out of range. Must be between ${minContribution} and ${maxContribution} USDT.`);
    }
}

// Buy Tokens with USDT
async function buyTokensWithUSDT() {
    try {
        if (!tronWeb) throw new Error("TronWeb not initialized.");
        const contract = await tronWeb.contract().at(presaleContractAddress);
        const usdtContract = await tronWeb.contract().at(usdtContractAddress);

        const amount = parseFloat(document.getElementById("investmentAmount").value);
        if (!amount || amount <= 0) throw new Error("Enter a valid amount.");

        // Validate USDT contribution
        validateContribution(amount);

        const usdtAmount = tronWeb.toSun(amount);

        // Show processing message
        showProcessingMessage();

        // Approve USDT spending
        await usdtContract.approve(presaleContractAddress, usdtAmount).send();

        // Buy IRT tokens
        await contract.buyWithUSDT(usdtAmount).send();

        alert("Transaction successful!");
        updateTokenAmount();
    } catch (error) {
        alert("Error buying tokens: " + error.message);
    } finally {
        // Hide processing message
        hideProcessingMessage();
    }
}

// Buy Tokens with TRX
async function buyTokensWithTRX() {
    try {
        if (!tronWeb) throw new Error("TronWeb not initialized.");
        const contract = await tronWeb.contract().at(presaleContractAddress);

        const amount = parseFloat(document.getElementById("investmentAmount").value);
        if (!amount || amount <= 0) throw new Error("Enter a valid amount.");

        // Validate USDT contribution
        validateContribution(amount);

        // Convert USDT amount to TRX
        const trxAmount = Math.floor(tronWeb.toSun(amount / trxToUsd)); // Ensure integer

        // Show processing message
        showProcessingMessage();

        // Send TRX to contract
        const transaction = await contract.buyWithTRX().send({ callValue: trxAmount });

        console.log("Transaction Successful:", transaction);
        alert("Transaction successful!");
        updateTokenAmount();
    } catch (error) {
        console.error("Full Error Object:", error);
        alert("Error buying tokens: " + (error.message || "Unknown error"));
    } finally {
        // Hide processing message
        hideProcessingMessage();
    }
}

// Update token amount based on input
function updateTokenAmount() {
    let amount = parseFloat(document.getElementById("investmentAmount").value) || 0;
    let irtPerUsdt = 1 / inrToUsd;  // Use dynamic rate from oracle

    document.getElementById("tokensToReceive").innerText = (amount * irtPerUsdt).toFixed(2) + " IRT";
    document.getElementById("buyWithTRX").innerText = "Buy with TRX (" + (amount / trxToUsd).toFixed(2) + " TRX)";
    document.getElementById("buyWithUSDT").innerText = "Buy with USDT (" + (amount).toFixed(2) + " USDT)";
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Attach event listeners
    document.getElementById("connectWallet").addEventListener("click", detectWallet);
    document.getElementById("buyWithTRX").addEventListener("click", buyTokensWithTRX);
    document.getElementById("buyWithUSDT").addEventListener("click", buyTokensWithUSDT);

    // Initialize exchange rates
    fetchRates();
    setInterval(fetchRates, 60000); // Update every 60 seconds
});
