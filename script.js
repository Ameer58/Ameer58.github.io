const presaleContractAddress = "TPNnCKzmr8ytTBmraBR46Cc1aA1HCzx6Bg"; // Replace with actual address
const usdtContractAddress = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"; // Replace with actual address
const irtContractAddress = "TLhwe7cYFV7qrT3Vs4sB3fsjJtamZMh8BH"; // Replace with actual address

let tronWeb;
let exchangeRate = 82.5; // Default USD to INR exchange rate
let trxToUsd = 0.08; // Default TRX to USD rate
const coingeckoApiKey = "CG-PbnWHmZg4QwzACdFLmS1EZmd"; // Replace with your CoinGecko API key

// Fetch TRX to USD rate using CoinGecko API
async function fetchTRXtoUSD() {
    try {
        const trxResponse = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd&x_cg_demo_api_key=${coingeckoApiKey}`
        );
        const trxData = await trxResponse.json();
        if (trxData.tron && trxData.tron.usd) {
            return trxData.tron.usd; // Return TRX/USD rate
        }
        throw new Error("Failed to fetch TRX rate.");
    } catch (error) {
        console.error("Error fetching TRX rate: ", error);
        return 0.08; // Fallback TRX/USD rate
    }
}

// Fetch and update exchange rates
async function updateExchangeRates() {
    try {
        // Fetch USD to INR rate from ExchangeRate-API
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();
        if (data.result === "success" && data.rates && data.rates.INR) {
            exchangeRate = data.rates.INR; // 1 USDT = X IRT
            const usdtToIrtElement = document.getElementById("usdtToIrtRate");
            if (usdtToIrtElement) {
                usdtToIrtElement.innerText = exchangeRate.toFixed(2) + " IRT";
            }
        } else {
            throw new Error("Failed to fetch USD to INR rate.");
        }

        // Fetch TRX to USD rate
        trxToUsd = await fetchTRXtoUSD();
        const usdtToTrx = 1 / trxToUsd; // 1 USDT = Z TRX
        const usdtToTrxElement = document.getElementById("usdtToTrxRate");
        if (usdtToTrxElement) {
            usdtToTrxElement.innerText = usdtToTrx.toFixed(2) + " TRX";
        }
    } catch (error) {
        console.error("Error fetching exchange rates: ", error);
        // Fallback values
        const usdtToIrtElement = document.getElementById("usdtToIrtRate");
        if (usdtToIrtElement) {
            usdtToIrtElement.innerText = exchangeRate.toFixed(2) + " IRT";
        }
        const usdtToTrxElement = document.getElementById("usdtToTrxRate");
        if (usdtToTrxElement) {
            usdtToTrxElement.innerText = (1 / trxToUsd).toFixed(2) + " TRX";
        }
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
        const irtAmount = usdtAmount * exchangeRate;

        // Show processing message
        showProcessingMessage();

        // Approve USDT spending
        await usdtContract.approve(presaleContractAddress, usdtAmount).send();

        // Buy IRT tokens
        await contract.buyIRT(usdtAmount, irtAmount).send();

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

        // Convert IRT to 6 decimals (multiply by 10^6)
        const irtAmount = Math.floor(amount * exchangeRate * 10**6); // Convert to integer

        // Debugging logs
        console.log(`USDT Amount: ${amount}`);
        console.log(`TRX to be sent (callValue): ${trxAmount} Sun`);
        console.log(`IRT Tokens to receive: ${irtAmount} Smallest Units`);

        // Check if values are valid before sending transaction
        if (isNaN(trxAmount) || trxAmount <= 0) throw new Error("Invalid TRX amount.");
        if (isNaN(irtAmount) || irtAmount <= 0) throw new Error("Invalid IRT amount.");

        // Show processing message
        showProcessingMessage();

        // Send TRX to contract
        const transaction = await contract.buyWithTRX(irtAmount).send({ callValue: trxAmount });

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
    let irtPerUsdt = exchangeRate;  // Use dynamic rate

    document.getElementById("tokensToReceive").innerText = (amount * irtPerUsdt).toFixed(2) + " IRT";
    document.getElementById("buyWithTRX").innerText = "Buy with TRX (" + (amount / trxToUsd).toFixed(2) + " TRX)";
    document.getElementById("buyWithUSDT").innerText = "Buy with USDT (" + (amount).toFixed(2) + " USDT)";
}

// Show rate on hover
function showRate(currency) {
    let rate = currency === "trx" ? `1 TRX = ${trxToUsd.toFixed(2)} USDT` : `1 USDT = ${exchangeRate.toFixed(2)} IRT`;
    document.getElementById("rateInfo").innerText = rate;
}

// Hide rate on mouseout
function hideRate() {
    document.getElementById("rateInfo").innerText = "Hover over a button to see the exchange rate.";
}

// Countdown Timer (2.5 months)
function updateCountdown() {
    let presaleEnd = new Date();
    presaleEnd.setMonth(presaleEnd.getMonth() + 2, presaleEnd.getDate() + 15);

    let now = new Date();
    let timeLeft = presaleEnd - now;

    let days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    let hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
    let minutes = Math.floor((timeLeft / 1000 / 60) % 60);
    let seconds = Math.floor((timeLeft / 1000) % 60);

    document.getElementById("countdownTimer").innerText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Attach event listeners
    document.getElementById("connectWallet").addEventListener("click", detectWallet);
    document.getElementById("buyWithTRX").addEventListener("click", buyTokensWithTRX);
    document.getElementById("buyWithUSDT").addEventListener("click", buyTokensWithUSDT);

    // Initialize countdown and exchange rates
    updateCountdown();
    setInterval(updateCountdown, 1000);
    updateExchangeRates();
    setInterval(updateExchangeRates, 60000); // Update every 60 seconds
});