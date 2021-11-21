const {
	AccountId,
	PrivateKey,
	Client,
	TokenCreateTransaction,
	TokenInfoQuery,
	TokenType,
	CustomRoyaltyFee,
	CustomFixedFee,
	Hbar,
	TokenSupplyType,
	TokenMintTransaction,
	TokenBurnTransaction,
	TransferTransaction,
	AccountBalanceQuery,
	AccountUpdateTransaction,
	TokenAssociateTransaction
} = require('@hashgraph/sdk');
require('dotenv').config();

const operatorId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);
const treasuryId = AccountId.fromString(process.env.TEST_C_ACCT_ID);
const treasuryKey = PrivateKey.fromString(process.env.TEST_C_PVT_KEY);
const aliceId = AccountId.fromString(process.env.TEST_A_ACCT_ID);
const aliceKey = PrivateKey.fromString(process.env.TEST_A_PVT_KEY);
const bobId = AccountId.fromString(process.env.TEST_B_ACCT_ID);
const bobKey = PrivateKey.fromString(process.env.TEST_B_PVT_KEY);

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

// IPFS Content Identifiers for NFT Metadata.json
CID = [
	'QmUifMdgQ6zecjUYDwysEPHEwAvQdmvABmNjJ9qXpah5XP',
	'QmYTdZSzKqSRGXqbApengex8apWqp79RcSzcVTRC612X9A',
	'QmW4iMCrc4WPTW9iGeLuYvx3WjxD7apGU9eexvjSwh5cnW',
	'QmayStUeD3RrXh2hJWkUnk8Qw3G1ZrX1NURmrkcNKxDpvK',
	'QmQoUtsHchhXCQ1UVHFq6j4BRd45pTiodTKoedyo26RpZM'
];

async function main() {
	// define custom fee schedule
	let nftCustomFee = await new CustomRoyaltyFee()
		.setNumerator(1)
		.setDenominator(2)
		.setFeeCollectorAccountId(treasuryId)
		.setFallbackFee(new CustomFixedFee().setHbarAmount(new Hbar(200)));

	// Let's create the NFT with the custom fee
	let nftCreate = await new TokenCreateTransaction()
		.setTokenName('Maple Leaves... as NFTs')
		.setTokenSymbol('MLEAF')
		.setTokenType(TokenType.NonFungibleUnique)
		.setDecimals(0)
		.setInitialSupply(0)
		.setTreasuryAccountId(treasuryId)
		.setSupplyType(TokenSupplyType.Finite)
		.setMaxSupply(CID.length)
		.setCustomFees([ nftCustomFee ])
		.setAdminKey(adminKey)
		.setSupplyKey(supplyKey)
		.freezeWith(client)
		.sign(treasuryKey);

	let nftCreateSign = await nftCreate.sign(adminKey);
	let nftCreateSubmit = await nftCreateSign.execute(client);
	let nftCreateRx = await nftCreateSubmit.getReceipt(client);
	let tokenId = nftCreateRx.tokenId;
	console.log(`Created NFT with Token ID: ${tokenId} \n`);

	// Run token query to check that custom fee schedule is associated w/ NFT
	let tokenInfo = await new TokenInfoQuery().setTokenId(tokenId).execute(client);
	console.table(tokenInfo.customFees[0]);

	// Now let's mint our batch of tokens...
	nftLeaf = [];
	for (let i = 0; i < CID.length; i++) {
		nftLeaf[i] = await tokenMinterFnt(CID[i]);
		console.log(`Created NFT ${tokenId} with Serial: ${nftLeaf[i].serials[0].low}`);
	}

	// Let's burn the last NFT in the collection.
	let tokenBurnTx = await new TokenBurnTransaction()
		.setTokenId(tokenId)
		.setSerials([ CID.length ])
		.freezeWith(client)
		.sign(supplyKey);
	let tokenBurnSubmit = await tokenBurnTx.execute(client);
	let tokenBurnRx = await tokenBurnSubmit.getReceipt(client);
	console.log(`\nBurn NFT with serial ${CID.length}: ${tokenBurnRx.status} \n`);

	tokenInfo = await new TokenInfoQuery().setTokenId(tokenId).execute(client);
	console.log(`Current NFT Supply: ${tokenInfo.totalSupply} \n`);

	// Auto-association of tokens to Alice's account id
	let associateTx = await new AccountUpdateTransaction()
		.setAccountId(aliceId)
		.setMaxAutomaticTokenAssociations(100)
		.freezeWith(client)
		.sign(aliceKey);
	let associateTxSubmit = await associateTx.execute(client);
	let associateRx = await associateTxSubmit.getReceipt(client);
	console.log(`Alice NFT Auto-association ${associateRx.status} \n`);

	// Manual Association for Bob's account
	let associateBobTx = await new TokenAssociateTransaction()
		.setAccountId(bobId)
		.setTokenIds([ tokenId ])
		.freezeWith(client)
		.sign(bobKey);
	let associateBobTxSubmit = await associateBobTx.execute(client);
	let associateBobRx = await associateBobTxSubmit.getReceipt(client);
	console.log(`Bob NFT Manual Association: ${associateBobRx.status} \n`);

	// Balance Check 1
	treasuryBalance = await balanceCheck(treasuryId);
	aliceBalance = await balanceCheck(aliceId);
	bobBalance = await balanceCheck(bobId);
	console.log(`- Treasury Balance: ${treasuryBalance[0]} NFTs of ID: ${tokenId} and ${treasuryBalance[1]}`);
	console.log(`- Alice Balance: ${aliceBalance[0]} NFTs of ID: ${tokenId} and ${aliceBalance[1]}`);
	console.log(`- Bob Balance: ${bobBalance[0]} NFTs of ID: ${tokenId} and ${bobBalance[1]}`);

	// 1st Transfer NFT Treasury
	let tokenTransferTx = await new TransferTransaction()
		.addNftTransfer(tokenId, 2, treasuryId, aliceId)
		.freezeWith(client)
		.sign(treasuryKey);
	let tokenTransferSubmit = await tokenTransferTx.execute(client);
	let tokenTransferRx = await tokenTransferSubmit.getReceipt(client);
	console.log(`NFT transfer Treasury -> Alice Status: ${tokenTransferRx.status} \n`);

	// Balance Check 2
	treasuryBalance = await balanceCheck(treasuryId);
	aliceBalance = await balanceCheck(aliceId);
	bobBalance = await balanceCheck(bobId);
	console.log(`- Treasury Balance: ${treasuryBalance[0]} NFTs of ID: ${tokenId} and ${treasuryBalance[1]}`);
	console.log(`- Alice Balance: ${aliceBalance[0]} NFTs of ID: ${tokenId} and ${aliceBalance[1]}`);
	console.log(`- Bob Balance: ${bobBalance[0]} NFTs of ID: ${tokenId} and ${bobBalance[1]}`);

	// 2nd NFT Transfer from Alice to Bob
	let tokenTransferTx2 = await new TransferTransaction()
		.addNftTransfer(tokenId, 2, aliceId, bobId)
		.addHbarTransfer(aliceId, 2)
		.addHbarTransfer(bobId, -2)
		.freezeWith(client)
		.sign(aliceKey);
	let tokenTransferTx2Sign = await tokenTransferTx2.sign(bobKey);
	let tokenTransferSubmit2 = await tokenTransferTx2.execute(client);
	let tokenTransferRx2 = await tokenTransferSubmit2.getReceipt(client);
	console.log(`\n NFT transfer Alice -> Bob Status: ${tokenTransferRx2.status} \n`);

	// Balance Check 3
	treasuryBalance = await balanceCheck(treasuryId);
	aliceBalance = await balanceCheck(aliceId);
	bobBalance = await balanceCheck(bobId);
	console.log(`- Treasury Balance: ${treasuryBalance[0]} NFTs of ID: ${tokenId} and ${treasuryBalance[1]}`);
	console.log(`- Alice Balance: ${aliceBalance[0]} NFTs of ID: ${tokenId} and ${aliceBalance[1]}`);
	console.log(`- Bob Balance: ${bobBalance[0]} NFTs of ID: ${tokenId} and ${bobBalance[1]}`);

	// Token Minter function
	async function tokenMinterFnt(CID) {
		mintTx = await new TokenMintTransaction()
			.setTokenId(tokenId) // set token id
			.setMetadata([ Buffer.from(CID) ]) // set metadata
			.freezeWith(client); // freeze tx for signing
		let mintTxSign = await mintTx.sign(supplyKey); // mints & burns require signature w/ supply key
		let mintTxSubmit = await mintTxSign.execute(client); // submit to network after signing
		let mintRx = await mintTxSubmit.getReceipt(client); // get that receipt
		return mintRx;
	}

	// Balance Check Function
	async function balanceCheck(id) {
		balanceCheckTx = await new AccountBalanceQuery().setAccountId(id).execute(client);
		return [ balanceCheckTx.tokens._map.get(tokenId.toString()), balanceCheckTx.hbars ];
	}
}

main();
