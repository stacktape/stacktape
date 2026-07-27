// This file is auto-generated. Do not edit manually.
// Source: aws-batch-jobdefinition.json

/** Resource Type definition for AWS::Batch::JobDefinition */
export type AwsBatchJobdefinition = {
  ContainerProperties?: {
    /** @uniqueItems false */
    Command?: string[];
    /** @uniqueItems false */
    Environment?: {
      Name?: string;
      Value?: string;
    }[];
    Image: string;
    JobRoleArn?: string;
    Memory?: number;
    /** @uniqueItems false */
    MountPoints?: {
      ContainerPath?: string;
      ReadOnly?: boolean;
      SourceVolume?: string;
    }[];
    Privileged?: boolean;
    ReadonlyRootFilesystem?: boolean;
    /** @uniqueItems false */
    Ulimits?: {
      HardLimit: number;
      Name: string;
      SoftLimit: number;
    }[];
    User?: string;
    Vcpus?: number;
    /** @uniqueItems false */
    Volumes?: {
      Host?: {
        SourcePath?: string;
      };
      EfsVolumeConfiguration?: {
        FileSystemId: string;
        RootDirectory?: string;
        TransitEncryption?: string;
        TransitEncryptionPort?: number;
        AuthorizationConfig?: {
          AccessPointId?: string;
          Iam?: string;
        };
      };
      Name?: string;
    }[];
    /** @uniqueItems false */
    ResourceRequirements?: {
      Type?: string;
      Value?: string;
    }[];
    LinuxParameters?: {
      /** @uniqueItems false */
      Devices?: {
        HostPath?: string;
        ContainerPath?: string;
        /** @uniqueItems false */
        Permissions?: string[];
      }[];
      InitProcessEnabled?: boolean;
      MaxSwap?: number;
      Swappiness?: number;
      SharedMemorySize?: number;
      /** @uniqueItems false */
      Tmpfs?: {
        ContainerPath: string;
        Size: number;
        /** @uniqueItems false */
        MountOptions?: string[];
      }[];
    };
    LogConfiguration?: {
      LogDriver: string;
      Options?: Record<string, string>;
      /** @uniqueItems false */
      SecretOptions?: {
        Name: string;
        ValueFrom: string;
      }[];
    };
    ExecutionRoleArn?: string;
    /** @uniqueItems false */
    Secrets?: {
      Name: string;
      ValueFrom: string;
    }[];
    NetworkConfiguration?: {
      AssignPublicIp?: string;
    };
    FargatePlatformConfiguration?: {
      PlatformVersion?: string;
    };
    EphemeralStorage?: {
      SizeInGiB: number;
    };
    RuntimePlatform?: {
      OperatingSystemFamily?: string;
      CpuArchitecture?: string;
    };
    RepositoryCredentials?: {
      CredentialsParameter: string;
    };
    EnableExecuteCommand?: boolean;
  };
  EcsProperties?: {
    /** @uniqueItems false */
    TaskProperties: {
      /** @uniqueItems false */
      Containers?: {
        /** @uniqueItems false */
        Command?: string[];
        /** @uniqueItems false */
        Environment?: {
          Name?: string;
          Value?: string;
        }[];
        /** @uniqueItems false */
        DependsOn?: {
          ContainerName: string;
          Condition: string;
        }[];
        Name?: string;
        Image: string;
        LinuxParameters?: {
          /** @uniqueItems false */
          Devices?: {
            HostPath?: string;
            ContainerPath?: string;
            /** @uniqueItems false */
            Permissions?: string[];
          }[];
          InitProcessEnabled?: boolean;
          MaxSwap?: number;
          Swappiness?: number;
          SharedMemorySize?: number;
          /** @uniqueItems false */
          Tmpfs?: {
            ContainerPath: string;
            Size: number;
            /** @uniqueItems false */
            MountOptions?: string[];
          }[];
        };
        LogConfiguration?: {
          LogDriver: string;
          Options?: Record<string, string>;
          /** @uniqueItems false */
          SecretOptions?: {
            Name: string;
            ValueFrom: string;
          }[];
        };
        /** @uniqueItems false */
        MountPoints?: {
          ContainerPath?: string;
          ReadOnly?: boolean;
          SourceVolume?: string;
        }[];
        Essential?: boolean;
        Privileged?: boolean;
        ReadonlyRootFilesystem?: boolean;
        /** @uniqueItems false */
        Ulimits?: {
          HardLimit: number;
          Name: string;
          SoftLimit: number;
        }[];
        User?: string;
        /** @uniqueItems false */
        Secrets?: {
          Name: string;
          ValueFrom: string;
        }[];
        RepositoryCredentials?: {
          CredentialsParameter: string;
        };
        /** @uniqueItems false */
        ResourceRequirements?: {
          Type?: string;
          Value?: string;
        }[];
        FirelensConfiguration?: {
          Type: string;
          Options?: Record<string, string>;
        };
      }[];
      EphemeralStorage?: {
        SizeInGiB: number;
      };
      ExecutionRoleArn?: string;
      RuntimePlatform?: {
        OperatingSystemFamily?: string;
        CpuArchitecture?: string;
      };
      NetworkConfiguration?: {
        AssignPublicIp?: string;
      };
      /** @uniqueItems false */
      Volumes?: {
        Host?: {
          SourcePath?: string;
        };
        EfsVolumeConfiguration?: {
          FileSystemId: string;
          RootDirectory?: string;
          TransitEncryption?: string;
          TransitEncryptionPort?: number;
          AuthorizationConfig?: {
            AccessPointId?: string;
            Iam?: string;
          };
        };
        Name?: string;
      }[];
      PidMode?: string;
      IpcMode?: string;
      PlatformVersion?: string;
      TaskRoleArn?: string;
      EnableExecuteCommand?: boolean;
    }[];
  };
  NodeProperties?: {
    NumNodes: number;
    MainNode: number;
    /** @uniqueItems false */
    NodeRangeProperties: {
      TargetNodes: string;
      Container?: {
        /** @uniqueItems false */
        Command?: string[];
        /** @uniqueItems false */
        Environment?: {
          Name?: string;
          Value?: string;
        }[];
        Image: string;
        JobRoleArn?: string;
        Memory?: number;
        /** @uniqueItems false */
        MountPoints?: {
          ContainerPath?: string;
          ReadOnly?: boolean;
          SourceVolume?: string;
        }[];
        Privileged?: boolean;
        ReadonlyRootFilesystem?: boolean;
        /** @uniqueItems false */
        Ulimits?: {
          HardLimit: number;
          Name: string;
          SoftLimit: number;
        }[];
        User?: string;
        Vcpus?: number;
        /** @uniqueItems false */
        Volumes?: {
          Host?: {
            SourcePath?: string;
          };
          EfsVolumeConfiguration?: {
            FileSystemId: string;
            RootDirectory?: string;
            TransitEncryption?: string;
            TransitEncryptionPort?: number;
            AuthorizationConfig?: {
              AccessPointId?: string;
              Iam?: string;
            };
          };
          Name?: string;
        }[];
        InstanceType?: string;
        /** @uniqueItems false */
        ResourceRequirements?: {
          Type?: string;
          Value?: string;
        }[];
        LinuxParameters?: {
          /** @uniqueItems false */
          Devices?: {
            HostPath?: string;
            ContainerPath?: string;
            /** @uniqueItems false */
            Permissions?: string[];
          }[];
          InitProcessEnabled?: boolean;
          MaxSwap?: number;
          Swappiness?: number;
          SharedMemorySize?: number;
          /** @uniqueItems false */
          Tmpfs?: {
            ContainerPath: string;
            Size: number;
            /** @uniqueItems false */
            MountOptions?: string[];
          }[];
        };
        LogConfiguration?: {
          LogDriver: string;
          Options?: Record<string, string>;
          /** @uniqueItems false */
          SecretOptions?: {
            Name: string;
            ValueFrom: string;
          }[];
        };
        ExecutionRoleArn?: string;
        /** @uniqueItems false */
        Secrets?: {
          Name: string;
          ValueFrom: string;
        }[];
        EphemeralStorage?: {
          SizeInGiB: number;
        };
        RuntimePlatform?: {
          OperatingSystemFamily?: string;
          CpuArchitecture?: string;
        };
        RepositoryCredentials?: {
          CredentialsParameter: string;
        };
        EnableExecuteCommand?: boolean;
      };
      EcsProperties?: {
        /** @uniqueItems false */
        TaskProperties: {
          /** @uniqueItems false */
          Containers?: {
            /** @uniqueItems false */
            Command?: string[];
            /** @uniqueItems false */
            Environment?: {
              Name?: string;
              Value?: string;
            }[];
            /** @uniqueItems false */
            DependsOn?: {
              ContainerName: string;
              Condition: string;
            }[];
            Name?: string;
            Image: string;
            LinuxParameters?: {
              /** @uniqueItems false */
              Devices?: {
                HostPath?: string;
                ContainerPath?: string;
                /** @uniqueItems false */
                Permissions?: string[];
              }[];
              InitProcessEnabled?: boolean;
              MaxSwap?: number;
              Swappiness?: number;
              SharedMemorySize?: number;
              /** @uniqueItems false */
              Tmpfs?: {
                ContainerPath: string;
                Size: number;
                /** @uniqueItems false */
                MountOptions?: string[];
              }[];
            };
            LogConfiguration?: {
              LogDriver: string;
              Options?: Record<string, string>;
              /** @uniqueItems false */
              SecretOptions?: {
                Name: string;
                ValueFrom: string;
              }[];
            };
            /** @uniqueItems false */
            MountPoints?: {
              ContainerPath?: string;
              ReadOnly?: boolean;
              SourceVolume?: string;
            }[];
            Essential?: boolean;
            Privileged?: boolean;
            ReadonlyRootFilesystem?: boolean;
            /** @uniqueItems false */
            Ulimits?: {
              HardLimit: number;
              Name: string;
              SoftLimit: number;
            }[];
            User?: string;
            /** @uniqueItems false */
            Secrets?: {
              Name: string;
              ValueFrom: string;
            }[];
            RepositoryCredentials?: {
              CredentialsParameter: string;
            };
            /** @uniqueItems false */
            ResourceRequirements?: {
              Type?: string;
              Value?: string;
            }[];
            FirelensConfiguration?: {
              Type: string;
              Options?: Record<string, string>;
            };
          }[];
          ExecutionRoleArn?: string;
          /** @uniqueItems false */
          Volumes?: {
            Host?: {
              SourcePath?: string;
            };
            EfsVolumeConfiguration?: {
              FileSystemId: string;
              RootDirectory?: string;
              TransitEncryption?: string;
              TransitEncryptionPort?: number;
              AuthorizationConfig?: {
                AccessPointId?: string;
                Iam?: string;
              };
            };
            Name?: string;
          }[];
          PidMode?: string;
          IpcMode?: string;
          TaskRoleArn?: string;
          EnableExecuteCommand?: boolean;
        }[];
      };
      EksProperties?: {
        PodProperties?: {
          ServiceAccountName?: string;
          HostNetwork?: boolean;
          DnsPolicy?: string;
          /** @uniqueItems false */
          InitContainers?: {
            Name?: string;
            Image: string;
            ImagePullPolicy?: string;
            /** @uniqueItems false */
            Command?: string[];
            /** @uniqueItems false */
            Args?: string[];
            /** @uniqueItems false */
            Env?: {
              Name: string;
              Value?: string;
            }[];
            Resources?: {
              Limits?: Record<string, string>;
              Requests?: Record<string, string>;
            };
            /** @uniqueItems false */
            VolumeMounts?: {
              Name?: string;
              MountPath?: string;
              SubPath?: string;
              ReadOnly?: boolean;
            }[];
            SecurityContext?: {
              RunAsUser?: number;
              RunAsGroup?: number;
              Privileged?: boolean;
              AllowPrivilegeEscalation?: boolean;
              ReadOnlyRootFilesystem?: boolean;
              RunAsNonRoot?: boolean;
            };
          }[];
          /** @uniqueItems false */
          Containers?: {
            Name?: string;
            Image: string;
            ImagePullPolicy?: string;
            /** @uniqueItems false */
            Command?: string[];
            /** @uniqueItems false */
            Args?: string[];
            /** @uniqueItems false */
            Env?: {
              Name: string;
              Value?: string;
            }[];
            Resources?: {
              Limits?: Record<string, string>;
              Requests?: Record<string, string>;
            };
            /** @uniqueItems false */
            VolumeMounts?: {
              Name?: string;
              MountPath?: string;
              SubPath?: string;
              ReadOnly?: boolean;
            }[];
            SecurityContext?: {
              RunAsUser?: number;
              RunAsGroup?: number;
              Privileged?: boolean;
              AllowPrivilegeEscalation?: boolean;
              ReadOnlyRootFilesystem?: boolean;
              RunAsNonRoot?: boolean;
            };
          }[];
          /** @uniqueItems false */
          Volumes?: {
            Name: string;
            HostPath?: {
              Path?: string;
            };
            EmptyDir?: {
              Medium?: string;
              SizeLimit?: string;
            };
            Secret?: {
              SecretName: string;
              Optional?: boolean;
            };
            PersistentVolumeClaim?: {
              ClaimName: string;
              ReadOnly?: boolean;
            };
          }[];
          /** @uniqueItems false */
          ImagePullSecrets?: {
            Name?: string;
          }[];
          Metadata?: {
            Labels?: Record<string, string>;
            Annotations?: Record<string, string>;
            Namespace?: string;
          };
          ShareProcessNamespace?: boolean;
        };
      };
      ConsumableResourceProperties?: {
        /** @uniqueItems true */
        ConsumableResourceList: {
          /**
           * The ARN of the consumable resource the job definition should consume.
           * @pattern arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}
           */
          ConsumableResource: string;
          Quantity: number;
        }[];
      };
      /** @uniqueItems false */
      InstanceTypes?: string[];
    }[];
  };
  /** @maxLength 128 */
  JobDefinitionName?: string;
  JobDefinitionArn?: string;
  SchedulingPriority?: number;
  Parameters?: Record<string, string>;
  /** @uniqueItems false */
  PlatformCapabilities?: string[];
  PropagateTags?: boolean;
  RetryStrategy?: {
    Attempts?: number;
    /** @uniqueItems false */
    EvaluateOnExit?: {
      OnExitCode?: string;
      OnStatusReason?: string;
      OnReason?: string;
      Action: string;
    }[];
  };
  ResourceRetentionPolicy?: {
    /** @default false */
    SkipDeregisterOnUpdate?: boolean;
  };
  Timeout?: {
    AttemptDurationSeconds?: number;
  };
  Type: string;
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
  EksProperties?: {
    PodProperties?: {
      ServiceAccountName?: string;
      HostNetwork?: boolean;
      DnsPolicy?: string;
      /** @uniqueItems false */
      InitContainers?: {
        Name?: string;
        Image: string;
        ImagePullPolicy?: string;
        /** @uniqueItems false */
        Command?: string[];
        /** @uniqueItems false */
        Args?: string[];
        /** @uniqueItems false */
        Env?: {
          Name: string;
          Value?: string;
        }[];
        Resources?: {
          Limits?: Record<string, string>;
          Requests?: Record<string, string>;
        };
        /** @uniqueItems false */
        VolumeMounts?: {
          Name?: string;
          MountPath?: string;
          SubPath?: string;
          ReadOnly?: boolean;
        }[];
        SecurityContext?: {
          RunAsUser?: number;
          RunAsGroup?: number;
          Privileged?: boolean;
          AllowPrivilegeEscalation?: boolean;
          ReadOnlyRootFilesystem?: boolean;
          RunAsNonRoot?: boolean;
        };
      }[];
      /** @uniqueItems false */
      Containers?: {
        Name?: string;
        Image: string;
        ImagePullPolicy?: string;
        /** @uniqueItems false */
        Command?: string[];
        /** @uniqueItems false */
        Args?: string[];
        /** @uniqueItems false */
        Env?: {
          Name: string;
          Value?: string;
        }[];
        Resources?: {
          Limits?: Record<string, string>;
          Requests?: Record<string, string>;
        };
        /** @uniqueItems false */
        VolumeMounts?: {
          Name?: string;
          MountPath?: string;
          SubPath?: string;
          ReadOnly?: boolean;
        }[];
        SecurityContext?: {
          RunAsUser?: number;
          RunAsGroup?: number;
          Privileged?: boolean;
          AllowPrivilegeEscalation?: boolean;
          ReadOnlyRootFilesystem?: boolean;
          RunAsNonRoot?: boolean;
        };
      }[];
      /** @uniqueItems false */
      Volumes?: {
        Name: string;
        HostPath?: {
          Path?: string;
        };
        EmptyDir?: {
          Medium?: string;
          SizeLimit?: string;
        };
        Secret?: {
          SecretName: string;
          Optional?: boolean;
        };
        PersistentVolumeClaim?: {
          ClaimName: string;
          ReadOnly?: boolean;
        };
      }[];
      /** @uniqueItems false */
      ImagePullSecrets?: {
        Name?: string;
      }[];
      Metadata?: {
        Labels?: Record<string, string>;
        Annotations?: Record<string, string>;
        Namespace?: string;
      };
      ShareProcessNamespace?: boolean;
    };
  };
  ConsumableResourceProperties?: {
    /** @uniqueItems true */
    ConsumableResourceList: {
      /**
       * The ARN of the consumable resource the job definition should consume.
       * @pattern arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}
       */
      ConsumableResource: string;
      Quantity: number;
    }[];
  };
};
