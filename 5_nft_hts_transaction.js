const {
	AccountId,
	PrivateKey,
	Client,
	TokenCreateTransaction,
	TokenType,
	TokenSupplyType,
	TokenMintTransaction,
	TransferTransaction,
	AccountBalanceQuery,
} = require('@hashgraph/sdk');
require('dotenv').config();

const operatorId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);
const treasuryId = AccountId.fromString(process.env.TEST_C_ACCT_ID);
const treasuryKey = PrivateKey.fromString(process.env.TEST_C_PVT_KEY);
const aliceId = AccountId.fromString(process.env.TEST_A_ACCT_ID);
const aliceKey = PrivateKey.fromString(process.env.TEST_A_PVT_KEY);

// const client = Client.forTestnet().setOperator(operatorId, operatorKey);
const nodes = {
	'50.18.132.211:50211': new AccountId(3),
	'52.168.76.241:50211': new AccountId(4),
	'52.20.18.86:50211': new AccountId(5),
	// "52.183.45.65:50211": new AccountId(6),
	// "54.176.199.109:50211": new AccountId(7),
	'35.155.49.147:50211': new AccountId(8),
	'52.14.252.207:50211': new AccountId(9)
};
const client = Client.forNetwork(nodes).setOperator(operatorId, operatorKey);
const supplyKey = PrivateKey.generate();
const adminKey = PrivateKey.generate();

CID = [
	'QmUifMdgQ6zecjUYDwysEPHEwAvQdmvABmNjJ9qXpah5XP',
	'QmYTdZSzKqSRGXqbApengex8apWqp79RcSzcVTRC612X9A',
	'QmW4iMCrc4WPTW9iGeLuYvx3WjxD7apGU9eexvjSwh5cnW',
	'QmayStUeD3RrXh2hJWkUnk8Qw3G1ZrX1NURmrkcNKxDpvK',
	'QmQoUtsHchhXCQ1UVHFq6j4BRd45pTiodTKoedyo26RpZM'
];

async function main() {

    // Create Token...
	let nftCreate = await new TokenCreateTransaction()
		.setTokenName('Maple Leaves... as NFTs')
		.setTokenSymbol('MLEAF')
		.setTokenType(TokenType.NonFungibleUnique)
		.setDecimals(0)
		.setInitialSupply(0)
		.setTreasuryAccountId(treasuryId)
		.setSupplyType(TokenSupplyType.Finite)
		.setMaxSupply(CID.length)
		.setAdminKey(adminKey)
		.setSupplyKey(supplyKey)
		.freezeWith(client)
		.sign(treasuryKey);

	let nftCreateSign = await nftCreate.sign(adminKey);
	let nftCreateSubmit = await nftCreateSign.execute(client);
	let nftCreateRx = await nftCreateSubmit.getReceipt(client);
	let tokenId = nftCreateRx.tokenId;
	console.log(`Created NFT with Token ID: ${tokenId} \n`);

    // Mint NFTs...
	nftLeaf = [];
	for (let i = 0; i < CID.length; i++) {
		nftLeaf[i] = await tokenMinterFnt(CID[i]);
		console.log(`Created NFT ${tokenId} with Serial: ${nftLeaf[i].serials[0].low}`);
	}

	// Initial balance
	treasuryBalance = await balanceCheck(treasuryId);
	aliceBalance = await balanceCheck(aliceId);
	console.log(` \n- Treasury Balance: ${treasuryBalance[0]} NFTs of ID: ${tokenId} and ${treasuryBalance[1]}`);
	console.log(`- Alice Balance: ${aliceBalance[0]} NFTs of ID: ${tokenId} and ${aliceBalance[1]}`);

	await sellNft(nftLeaf.pop().serials[0], 1, aliceId, aliceKey);

	// final balance
	treasuryBalance = await balanceCheck(treasuryId);
	aliceBalance = await balanceCheck(aliceId);
	console.log(`- Treasury Balance: ${treasuryBalance[0]} NFTs of ID: ${tokenId} and ${treasuryBalance[1]}`);
	console.log(`- Alice Balance: ${aliceBalance[0]} NFTs of ID: ${tokenId} and ${aliceBalance[1]}`);

	async function tokenMinterFnt(CID) {
		mintTx = await new TokenMintTransaction()
			.setTokenId(tokenId)
			.setMetadata([ Buffer.from(CID) ])
			.freezeWith(client);
		let mintTxSign = await mintTx.sign(supplyKey);
		let mintTxSubmit = await mintTxSign.execute(client);
		let mintRx = await mintTxSubmit.getReceipt(client);
		return mintRx;
	}

	async function balanceCheck(id) {
		balanceCheckTx = await new AccountBalanceQuery().setAccountId(id).execute(client);
		return [ balanceCheckTx.tokens._map.get(tokenId.toString()), balanceCheckTx.hbars ];
	}

	async function sellNft(serialNo, hbars, user_acctId, user_key) {
		let nftSaleTx = await new TransferTransaction()
			.addNftTransfer(tokenId, serialNo, treasuryId, user_acctId)     // Transfer NFT by serial no. from treasury to alice
			.addHbarTransfer(treasuryId, hbars)                         	// increase treasury's balance by x hbars
			.addHbarTransfer(aliceId, -hbars)                           	// deduct alice's balance by x hbars
			.freezeWith(client)                                         	// freeze the transaction with client
			.sign(treasuryKey);                                         	// sign transaction with treasury key
		let nftSaleTxSign = await nftSaleTx.sign(user_key);             	// wait on transaction signature from alice
		let nftSaleSubmit = await nftSaleTx.execute(client);            	// submit transaction 
		let nftSaleRx = await nftSaleSubmit.getReceipt(client);         	// receive receipt
		console.log(`\n NFT transfer Treasury -> Alice Status: ${nftSaleRx.status} \n`);
	}
}
main();
