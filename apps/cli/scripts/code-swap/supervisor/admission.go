package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"
)

func statusKey() string {
	identity := taskID
	if role := os.Getenv("STP_BENCH_ROLE_ID"); role != "" {
		identity = role + ":" + taskID
	}
	return "status#" + app + "#" + identity
}
func acquireAdmission() error {
	if os.Getenv("STP_BENCH_ADMISSION") != "1" {
		admitted.Store(true)
		return nil
	}
	role := os.Getenv("STP_BENCH_ROLE_ID")
	if !strings.HasPrefix(role, "AROA") {
		return fmt.Errorf("startup_admission_unavailable: missing injected RoleId")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	grantKey := "admission#" + strings.TrimPrefix(statusKey(), "status#")
	requestedAt := now()
	for ctx.Err() == nil && !stopping.Load() {
		// The request key, not its contents, is the authority. A changing nonce
		// re-drives the stream after poison/outage without an autonomous image path.
		err := awsJSONContext(ctx, "dynamodb", "DynamoDB_20120810.PutItem", map[string]any{"TableName": table, "Item": map[string]any{
			"pk": map[string]string{"S": statusKey()}, "capacityRequest": map[string]string{"S": fmt.Sprint(now())},
			"capacityRequestedAt": map[string]string{"S": fmt.Sprint(requestedAt)},
		}}, nil)
		if err == nil {
			var result struct{ Item map[string]map[string]string }
			err = awsJSONContext(ctx, "dynamodb", "DynamoDB_20120810.GetItem", map[string]any{"TableName": table, "Key": map[string]any{"pk": map[string]string{"S": grantKey}}, "ConsistentRead": true}, &result)
			if err == nil && result.Item["refusal"]["S"] == "poller_capacity_exceeded" {
				return fmt.Errorf("poller_capacity_exceeded: protected startup capacity is full")
			}
			if err == nil && result.Item["data"]["S"] != "" {
				var grant struct {
					Owner, Task string
					Slot        int
				}
				if json.Unmarshal([]byte(result.Item["data"]["S"]), &grant) == nil && grant.Owner == statusKey() && grant.Task == taskID && grant.Slot >= 0 && grant.Slot < 500 {
					admitted.Store(true)
					return nil
				}
			}
		}
		select {
		case <-ctx.Done():
		case <-stop:
			return fmt.Errorf("task stopping")
		case <-time.After(time.Duration(3000+rand.Intn(2001)) * time.Millisecond):
		}
	}
	return fmt.Errorf("startup_admission_unavailable: no protected grant within 30 seconds")
}
