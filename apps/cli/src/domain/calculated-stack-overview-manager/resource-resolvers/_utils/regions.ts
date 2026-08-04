export const findBestFittingAvailableRegion = (targetRegion: string, availableRegions: string[]) => {
  // perfect fit
  if (availableRegions.includes(targetRegion)) {
    return targetRegion;
  }
  // close fit
  const splittedRegionName = targetRegion.split('-');
  const splittedAvailableRegions = availableRegions.map((regionName) => regionName.split('-'));
  const closeFit = splittedAvailableRegions.find(
    ([part0, part1, _part2]) => part0 === splittedRegionName[0] && part1 === splittedRegionName[1]
  );
  if (closeFit) {
    return closeFit.join('-');
  }
  // bit further
  const bitFurther = splittedAvailableRegions.find(([part0, _part1, _part2]) => part0 === splittedRegionName[0]);
  if (bitFurther) {
    return bitFurther.join('-');
  }

  // absolutely shitty stack region, simply deploy to us-east-1
  return availableRegions[0];
};
