export const isTransferAccelerationEnabledInRegion = ({ region }: { region: AWSRegion }) =>
  !['ap-east-1', 'ap-northeast-3', 'af-south-1', 'eu-north-1', 'me-south-1', 'eu-south-1'].includes(region);
