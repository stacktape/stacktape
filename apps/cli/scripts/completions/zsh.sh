#compdef stacktape
_stacktape() {
    zstyle ':completion:*:*:stacktape:*' group-name ''
    zstyle ':completion:*:*:stacktape::descriptions' format '%F{green}-- %d --%f'
    local program=stacktape
    typeset -A opt_args
    local curcontext="$curcontext" state line context
    _arguments -s \
        '1: :->cmd' \
        '*: :->args' &&
        ret=0

    case $state in
    cmd)
        main_commands=('<<MAIN_COMMANDS>>')
        main_commands=($main_commands)
        _alternative "args:command:(($main_commands))"
        ;;
    args)
        case ${line[1]} in
        <<COMMAND_ARGS>>
        esac
        ;;
    esac

}

if ! command -v compinit >/dev/null; then
    autoload -U compinit && compinit
fi

compdef _stacktape stacktape