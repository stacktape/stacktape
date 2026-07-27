#!/usr/bin/env bash

_file_arguments() {
    shopt -s extglob globstar
    local extensions="${1}";

    if [[ -z "${cur_word}" ]]; then
        COMPREPLY=( $(compgen -fG -X "${extensions}" -- "${cur_word}") );
    else
        COMPREPLY=( $(compgen -f -X "${extensions}" -- "${cur_word}") );
    fi
    shopt -u extglob globstar
}

_long_short_completion() {
    local wordlist="${1}";
    local short_options="${2}"

    [[ -z "${cur_word}" || "${cur_word}" =~ ^- ]] && {
        COMPREPLY=( $(compgen -W "${wordlist}" -- "${cur_word}"));
        return;
    }
    [[ "${cur_word}" =~ ^-[A-Za_z]+ ]] && {
        COMPREPLY=( $(compgen -W "${short_options}" -- "${cur_word}"));
        return;
    }
}

_subcommand_comp_reply() {
    local cur_word="${1}"
    local sub_commands="${2}"
    COMPREPLY+=( $(compgen -W "${sub_commands}" -- "${cur_word}") );
}

_comp__reassemble_words()
{
    local exclude="" i j line ref
    if [[ $1 ]]; then
        exclude="[${1//[^$COMP_WORDBREAKS]/}]"
    fi
    if [[ $exclude ]]; then
        line=$COMP_LINE
        for ((i = 0, j = 0; i < ${#COMP_WORDS[@]}; i++, j++)); do
            while [[ $i -gt 0 && ${COMP_WORDS[i]} == +($exclude) ]]; do
                [[ $line != [[:blank:]]* ]] && ((j >= 2)) && ((j--))
                ref="$2[$j]"
                printf -v "$ref" %s "${!ref-}${COMP_WORDS[i]}"
                ((i == COMP_CWORD)) && printf -v "$3" %s "$j"
                line=${line#*"${COMP_WORDS[i]}"}
                if ((i < ${#COMP_WORDS[@]} - 1)); then
                    ((i++))
                else
                    break 2
                fi
                [[ $line == [[:blank:]]* ]] && ((j++))
            done
            ref="$2[$j]"
            printf -v "$ref" %s "${!ref-}${COMP_WORDS[i]}"
            line=${line#*"${COMP_WORDS[i]}"}
            ((i == COMP_CWORD)) && printf -v "$3" %s "$j"
        done
        ((i == COMP_CWORD)) && printf -v "$3" %s "$j"
    else
        for i in "${!COMP_WORDS[@]}"; do
            printf -v "$2[i]" %s "${COMP_WORDS[i]}"
        done
    fi
}


_stp_completions() {
    local COMMANDS="<<COMMANDS>>";
    local cur_word="${COMP_WORDS[${COMP_CWORD}]}";
    local prev="${COMP_WORDS[$(( COMP_CWORD - 1 ))]}";
    local comp_words
    local comp_cword
    _comp__reassemble_words ":" "comp_words" "comp_cword"

    case "${prev}" in
<<OPTIONS_SWITCHES>>
    esac

    case "${comp_words[1]}" in
<<COMMAND_SWITCHES>>
        *)
            local replaced_script;
            _long_short_completion \
                "${GLOBAL_OPTIONS[*]}" \
                "${GLOBAL_OPTIONS[SHORT_OPTIONS]}"
            _subcommand_comp_reply "${cur_word}" "${COMMANDS}";
            [[ -z "${cur_word}" ]] && {
                declare -A comp_reply_associative="( $(echo ${COMPREPLY[@]} | sed 's/[^ ]*/[&]=&/g') )";
                [[ -z "${comp_reply_associative[${prev}]}" ]] && {
                    local re_prev_prev="(^| )${COMP_WORDS[(( COMP_CWORD - 2 ))]}($| )";
                    local global_option_with_extra_args="--bunfile --server-bunfile --config --port --cwd --public-dir --jsx-runtime --platform --loader";
                    [[
                        ( -n "${replaced_script}" && "${replaced_script}" == "${prev}" ) || \
                            ( "${global_option_with_extra_args}" =~ ${re_prev_prev} )
                    ]] && return;
                    unset COMPREPLY;
                }
            }
            return;;
    esac

}

complete -F _stp_completions stacktape
