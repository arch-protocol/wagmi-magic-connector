import { Chain, UserRejectedRequestError } from "viem";
import { DedicatedWalletConnector, DedicatedWalletOptions } from "./dedicatedWalletConnector";

/**
 * Email Wallet Connector class used to connect to wallet using email and Magic Auth.
 * Requires passing the user's email address in the connect method.
 * 
 * @example
 * ```typescript
 * import { Email Wallet Connector } from 'arch-protocol/wagmi-connector';
 * const connector = new EmailWalletConnector({
 *  options: {
 *     apiKey: YOUR_MAGIC_LINK_API_KEY, //required
 *    ...Other options
 *  },
 * });
 * ```
 * @see https://github.com/arch-protocol/wagmi-magic-connector#-usage
 * @see https://magic.link/docs/dedicated/overview
 */
export class EmailWalletConnector extends DedicatedWalletConnector {
    email: string

    constructor(config: { chains?: Chain[]; options: DedicatedWalletOptions }) {
      super(config)
      this.magicSdkConfiguration = config.options.magicSdkConfiguration
      this.oauthProviders = []
      this.enableEmailLogin = true
      this.magicOptions = config.options
      this.email = ''
    }

    /**
     * Ser the user's email address
     */
    setEmail(email: string) {
      this.email = email
    }

    /**
     * Connect method attempts to connects to wallet using Dedicated Wallet modal
     * this will open a modal for the user to select their wallet
     */
    async connect() {
      if (!this.magicOptions.apiKey)
        throw new Error('Magic API Key is not provided.')
      
      if (!this.email)
        throw new Error('Email is not provided.')  

      const provider = await this.getProvider()
  
      if (provider?.on) {
        provider.on('accountsChanged', this.onAccountsChanged)
        provider.on('chainChanged', this.onChainChanged)
        provider.on('disconnect', this.onDisconnect)
      }
  
      // Check if we have a chainId, in case of error just assign 0 for legacy
      let chainId: number
      try {
        chainId = await this.getChainId()
      } catch {
        chainId = 0
      }
  
      // if there is a user logged in, return the user
      if (await this.isAuthorized()) {
        return {
          provider,
          chain: {
            id: chainId,
            unsupported: false,
          },
          account: await this.getAccount(),
        }
      }
  
      const magic = this.getMagicSDK()
  
      // LOGIN WITH MAGIC USING EMAIL
      await magic.auth.loginWithMagicLink({
        email: this.email,
      })
  
      if (await magic.user.isLoggedIn())
        return {
          account: await this.getAccount(),
          chain: {
            id: chainId,
            unsupported: false,
          },
          provider,
        }
      throw new UserRejectedRequestError(Error('User Rejected Request'))
    }

}