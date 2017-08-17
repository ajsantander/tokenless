import {
  CONNECT_WEB3,
  SET_ACTIVE_ACCOUNT_INDEX,
  UPDATE_NETWORK,
} from './actions';
import {
  USE_INJECTED_WEB3
} from '../constants';

const initialState = {
  isConnected: false,
  web3: undefined,
  activeAccountIndex: undefined,
  activeAccountAddress: undefined,
  /* additional blockchain params */
};

export default function(state = initialState, action) {
  // console.log('NetworkReducer', action);

  switch(action.type) {

  case CONNECT_WEB3:
    return {
      ...state,
      web3: action.payload,
      isConnected: true
    };

  case UPDATE_NETWORK:
    // console.log('update network');
    const blockchain = action.payload;
    return {
      ...state,
      ...blockchain
    };

  case SET_ACTIVE_ACCOUNT_INDEX:
    let acct;
    if(!state.web3) return state;
    console.log('web3 accounts:', state.web3.eth.accounts);
    if(USE_INJECTED_WEB3) {
      acct = state.web3.eth.accounts[0];
    }
    else {
      acct = state.web3.eth.accounts[action.payload];
    }
    return {
      ...state,
      activeAccountIndex: action.payload,
      activeAccountAddress: acct
    };

  default:
    return state;
  }
}
