# A metrics agent that runs beside the API container and must not stop the workload if it exits.
FROM public.ecr.aws/docker/library/alpine:3.20
CMD ["sh", "-c", "while true; do echo metrics-agent alive; sleep 300; done"]
