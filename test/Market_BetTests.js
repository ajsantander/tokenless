/*eslint no-undef: "off"*/
const Market = artifacts.require('./Market.sol');
import * as util from '../src/utils/Web3Util';

contract('Market (Bets)', function(accounts) {

  before(() => {
    // console.log('accounts:', web3.eth.accounts);
  });

  it('should accepts funds via bets', async function() {

    const contract = await Market.new('Bitcoin will reach $5000 in October 1.', 32);

    const playerAddress = accounts[1];
    const initialPlayerBalance = util.getBalanceInEther(playerAddress, web3);
    const betValueEth = 1;
    await contract.bet(true, {
      from: playerAddress,
      value: web3.toWei(betValueEth, 'ether')
    });

    const newPlayerBalance = util.getBalanceInEther(playerAddress, web3);
    // console.log('newPlayerBalance', newPlayerBalance);
    const newContractBalance = util.getBalanceInEther(contract.address, web3);
    // console.log('newContractBalance', newContractBalance);

    assert.approximately(initialPlayerBalance - betValueEth, newPlayerBalance, 0.01, 'player balance was not deducted');
    assert.equal(1, newContractBalance, 'contract balance was not increased');
  });

  it('should keep track of a players positive bet balance', async function() {

    const contract = await Market.new('Bitcoin will reach $5000 in October 1.', 32);

    let playerNullBalance = web3.fromWei(await contract.getPlayerBalance(true, {
      from: accounts[1]
    }), 'ether').toNumber();
    // console.log('player 1 null balance: ', playerBalance);
    assert.equal(0, playerNullBalance, 'player balance supposed to be 0');
    playerNullBalance = web3.fromWei(await contract.getPlayerBalance(false, {
      from: accounts[1]
    }), 'ether').toNumber();
    // console.log('player 1 null balance: ', playerBalance);
    assert.equal(0, playerNullBalance, 'player balance supposed to be 0');

    await contract.bet(true, {
      from: accounts[1],
      value: web3.toWei(1, 'ether')
    });
    await contract.bet(false, {
      from: accounts[1],
      value: web3.toWei(2, 'ether')
    });

    const playerPosBalance = web3.fromWei(await contract.getPlayerBalance(true, {
      from: accounts[1]
    }), 'ether').toNumber();
    // console.log('player 1 pos balance: ', playerBalance);
    assert.equal(1, playerPosBalance, 'player balance was not tracked');

    const playerNegBalance = web3.fromWei(await contract.getPlayerBalance(false, {
      from: accounts[1]
    }), 'ether').toNumber();
    // console.log('player 1 neg balance: ', playerBalance);
    assert.equal(2, playerNegBalance, 'player balance was not tracked');
  });

  it('should not keep a balance for a player that didnt bet', async function() {

    const contract = await Market.new('Bitcoin will reach $5000 in October 1.', 32);

    let playerBalance = web3.fromWei(await contract.getPlayerBalance(false, {
      from: accounts[2]
    }), 'ether');
    playerBalance = web3.fromWei(await contract.getPlayerBalance(true, {
      from: accounts[2]
    }), 'ether');
    // console.log('player 2 balance: ', player2Balance);

    assert.equal(0, playerBalance, 'player wasnt supposed to have a balance');
  });

  it('should expose pot totals', async function() {

    const contract = await Market.new('Bitcoin will reach $5000 in October 1.', 32);

    let i;
    for(i = 0; i < 5; i++) {
      await contract.bet(true, {
        from: accounts[1],
        value: web3.toWei(1, 'ether')
      });
      await util.delay(1000);
      // console.log('positive bet');
    }
    for(i = 0; i < 3; i++) {
      await contract.bet(false, {
        from: accounts[1],
        value: web3.toWei(1, 'ether')
      });
      await util.delay(1000);
      // console.log('negative bet');
    }

    const positivePredicionBalance = web3.fromWei((await contract.totals.call(true)).toNumber());
    const negativePredicionBalance = web3.fromWei((await contract.totals.call(false)).toNumber());
    // console.log('positivePredicionBalance', positivePredicionBalance);
    // console.log('negativePredicionBalance', negativePredicionBalance);

    assert.equal(positivePredicionBalance, 5, 'incorrect prediction balance');
    assert.equal(negativePredicionBalance, 3, 'incorrect prediction balance');
  });

  it('should support 2 balances for each player', async function() {

    let i;

    const contract = await Market.new('Bitcoin will reach $5000 in October 1.', 32);

    // Implement the following structure in the contract.
    const datas = [
      {playerIdx: 0, pos: 1, neg: 2},
      {playerIdx: 1, pos: 3, neg: 0},
      {playerIdx: 2, pos: 1, neg: 1},
      {playerIdx: 3, pos: 4, neg: 1},
      {playerIdx: 4, pos: 0, neg: 0},
      {playerIdx: 5, pos: 0, neg: 7.2}
    ];
    for(i = 0; i < datas.length; i++) {

      const data = datas[i];
      const addr = accounts[data.playerIdx];

      // Place bets.
      // console.log('placing pos bet:', data.pos);
      if(data.pos !== 0) {
        await contract.bet(true, {
          from: addr,
          value: web3.toWei(data.pos, 'ether')
        });
      }
      // console.log('placing neg bet:', data.neg);
      if(data.neg !== 0) {
        await contract.bet(false, {
          from: addr,
          value: web3.toWei(data.neg, 'ether')
        });
      }

      // Read balance.
      const pos = web3.fromWei(await contract.getPlayerBalance(true, {
        from: addr
      }), 'ether').toNumber();
      // console.log('pos:', pos);
      const neg = web3.fromWei(await contract.getPlayerBalance(false, {
        from: addr
      }), 'ether').toNumber();
      // console.log('neg:', neg);

      // Compare contract state with expected state.
      assert.equal(pos, data.pos, 'unmatching balance');
      assert.equal(neg, data.neg, 'unmatching balance');
    }
  });

});
