P="--profile stacktape-e2e --region us-east-1"
od() { python3 -c "
import sys,json
for s in json.load(sys.stdin):
  d=json.loads(s); a=d['product']['attributes']
  for t in d['terms'].get('OnDemand',{}).values():
    for v in t['priceDimensions'].values():
      if float(v['pricePerUnit']['USD'])>0: print('$1', a.get('usagetype'), v['pricePerUnit']['USD'], v['unit'], v['description'][:80])
"; }
for t in t4g.nano t4g.micro; do aws pricing get-products $P --service-code AmazonEC2 --filters Type=TERM_MATCH,Field=instanceType,Value=$t Type=TERM_MATCH,Field=regionCode,Value=eu-west-1 Type=TERM_MATCH,Field=operatingSystem,Value=Linux Type=TERM_MATCH,Field=tenancy,Value=Shared Type=TERM_MATCH,Field=preInstalledSw,Value=NA Type=TERM_MATCH,Field=capacitystatus,Value=Used --query PriceList --output json | od $t; done
aws pricing get-products $P --service-code AmazonEC2 --filters Type=TERM_MATCH,Field=regionCode,Value=eu-west-1 Type=TERM_MATCH,Field=volumeApiName,Value=gp3 --query PriceList --output json | od gp3 | head -3
aws pricing get-products $P --service-code AmazonVPC --filters Type=TERM_MATCH,Field=regionCode,Value=eu-west-1 --query PriceList --output json | od vpc | command grep -i "ipv4\|natgateway" | head
