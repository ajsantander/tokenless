import { connectPrediction } from '.';
import { forgetPreview } from '../../market/actions/ForgetPredictionPreviewAction';

export function withdrawPrize() {
  return async function(dispatch, getState) {

    const prediction = getState().prediction.contract;

    // Listen for withdraw event...
    prediction.ClaimPrizeEvent().watch(async (error, result) => {
      console.log('ClaimPrizeEvent', error, result);
      if(error) {
        console.log('error withdrawing funds');
      }
      else {
        console.log('withdraw succesful!', result);

        // Claim != withdrawal, still need to
        // pull the ether out.
        await prediction.withdrawPayments({
          from: getState().network.activeAccountAddress
        });

        dispatch(forgetPreview(prediction.address));
        dispatch(connectPrediction(prediction.address));
      }
    });

    // Withdraw
    console.log('withdrawing prize...');
    await prediction.claimPrize({
      from: getState().network.activeAccountAddress
    });
  };
}
