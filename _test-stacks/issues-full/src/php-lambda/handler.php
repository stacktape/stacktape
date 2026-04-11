<?php

function handler($event, $context)
{
    throw new \RuntimeException("PHP RuntimeException from Lambda");
}
